import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service.js';
import {
  telegramFetch,
  telegramProxyEnabled,
} from './telegram-http.js';

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat?: { id: number };
    from?: { username?: string; id?: number };
  };
};

/**
 * Runs Telegram intake with the Nest process:
 * - `TELEGRAM_MODE=polling` (default in non-production) → long poll getUpdates
 * - `TELEGRAM_MODE=webhook` + `TELEGRAM_WEBHOOK_URL` → setWebhook on boot
 */
@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private abort: AbortController | null = null;
  private offset = 0;
  private loopPromise: Promise<void> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    const token = this.botToken();
    if (!token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN missing — Telegram bot is not started',
      );
      return;
    }

    const mode = this.resolveMode();
    if (mode === 'off') {
      this.logger.log('Telegram bot disabled (TELEGRAM_MODE=off)');
      return;
    }
    if (mode === 'webhook') {
      await this.installWebhook(token);
      return;
    }

    if (telegramProxyEnabled()) {
      this.logger.log('Telegram API via TELEGRAM_SOCKS_PROXY');
    }
    await this.startPolling(token);
  }

  async onModuleDestroy() {
    this.abort?.abort();
    if (this.loopPromise) {
      try {
        await this.loopPromise;
      } catch {
        // ignore
      }
    }
  }

  private resolveMode(): 'polling' | 'webhook' | 'off' {
    const explicit = this.config
      .get<string>('TELEGRAM_MODE', '')
      .trim()
      .toLowerCase();
    if (
      explicit === 'polling' ||
      explicit === 'webhook' ||
      explicit === 'off' ||
      explicit === 'disabled'
    ) {
      return explicit === 'disabled' ? 'off' : explicit;
    }
    const webhookUrl = this.config.get<string>('TELEGRAM_WEBHOOK_URL', '').trim();
    if (webhookUrl) return 'webhook';
    // Prefer long-poll when SOCKS is configured (common for RU VPS).
    if (telegramProxyEnabled()) return 'polling';
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    return nodeEnv === 'production' ? 'webhook' : 'polling';
  }

  private botToken() {
    return this.config.get<string>('TELEGRAM_BOT_TOKEN', '').trim();
  }

  private webhookSecret() {
    return this.config.get<string>('TELEGRAM_WEBHOOK_SECRET', '').trim();
  }

  private async installWebhook(token: string) {
    const baseUrl = this.config.get<string>('TELEGRAM_WEBHOOK_URL', '').trim();
    if (!baseUrl) {
      this.logger.error(
        'TELEGRAM_MODE=webhook but TELEGRAM_WEBHOOK_URL is empty',
      );
      return;
    }

    const secret = this.webhookSecret();
    const url = new URL(baseUrl);
    if (secret && !url.searchParams.has('secret')) {
      url.searchParams.set('secret', secret);
    }

    const body: Record<string, unknown> = {
      url: url.toString(),
      allowed_updates: ['message'],
      drop_pending_updates: true,
    };
    if (secret) {
      body.secret_token = secret;
    }

    const ok = await this.telegramApi(token, 'setWebhook', body);
    if (ok) {
      this.logger.log(`Telegram webhook set → ${url.origin}${url.pathname}`);
    }
  }

  private async startPolling(token: string) {
    // Avoid conflict with a leftover webhook from a previous env.
    for (let attempt = 1; attempt <= 5; attempt++) {
      const cleared = await this.telegramApi(token, 'deleteWebhook', {
        drop_pending_updates: true,
      });
      if (cleared) {
        this.logger.log('Telegram webhook cleared for polling mode');
        break;
      }
      this.logger.warn(
        `deleteWebhook failed (attempt ${attempt}/5) — retrying`,
      );
      await sleep(1_500, new AbortController().signal);
      if (attempt === 5) {
        this.logger.error(
          'Could not deleteWebhook — getUpdates will 409 while webhook is set',
        );
      }
    }

    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.logger.log('Telegram bot polling started (long poll with Nest)');

    this.loopPromise = this.pollLoop(token, signal);
  }

  private async pollLoop(token: string, signal: AbortSignal) {
    while (!signal.aborted) {
      try {
        const updates = await this.getUpdates(token, signal);
        for (const update of updates) {
          this.offset = update.update_id + 1;
          try {
            await this.notifications.handleTelegramWebhook(update);
          } catch (err) {
            this.logger.warn(
              `Telegram update ${update.update_id} failed: ${String(err)}`,
            );
          }
        }
      } catch (err) {
        if (signal.aborted) return;
        this.logger.warn(`Telegram poll error: ${String(err)}`);
        await sleep(2_000, signal);
      }
    }
  }

  private async getUpdates(
    token: string,
    signal: AbortSignal,
  ): Promise<TelegramUpdate[]> {
    const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
    url.searchParams.set('timeout', '25');
    url.searchParams.set('offset', String(this.offset));
    url.searchParams.set('allowed_updates', JSON.stringify(['message']));

    const response = await telegramFetch(url, { signal });
    if (!response.ok) {
      throw new Error(`getUpdates HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      ok?: boolean;
      result?: TelegramUpdate[];
      description?: string;
    };
    if (!payload.ok) {
      throw new Error(payload.description ?? 'getUpdates failed');
    }
    return payload.result ?? [];
  }

  private async telegramApi(
    token: string,
    method: string,
    body: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const response = await telegramFetch(
        `https://api.telegram.org/bot${token}/${method}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        description?: string;
      };
      if (!payload.ok) {
        this.logger.warn(
          `Telegram ${method} failed: ${payload.description ?? response.status}`,
        );
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(`Telegram ${method} error: ${String(err)}`);
      return false;
    }
  }
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
