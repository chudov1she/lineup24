import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BroadcastAudience,
  SubscriptionStatus,
  type Bet,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as webpush from 'web-push';
import { AuditService } from '../audit/audit.service.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import type { CreateBroadcastDto } from './dto/create-broadcast.dto.js';
import type { ListBroadcastsQueryDto } from './dto/list-broadcasts-query.dto.js';
import type { UserEmailDto } from './dto/user-email.dto.js';
import { telegramFetch } from './telegram-http.js';
import {
  escapeTelegramHtml,
  telegramBold,
  telegramCode,
  telegramLink,
} from './telegram-html.js';

export type PublicBroadcast = {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  sentCount: number;
  createdAt: Date;
  recipient: {
    id: string;
    username: string;
    email: string;
  } | null;
};

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id: number };
    from?: { username?: string; id?: number };
  };
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly audit: AuditService,
  ) {}

  assertTelegramWebhookSecret(
    querySecret: string | undefined,
    headerSecret: string | undefined,
  ) {
    const expected = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET', '').trim();
    if (!expected) {
      throw new UnauthorizedException('Telegram webhook is not configured');
    }
    const provided = querySecret ?? headerSecret;
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid telegram webhook secret');
    }
  }

  async handleTelegramWebhook(update: TelegramUpdate) {
    const message = update.message;
    if (!message?.text?.startsWith('/start')) {
      return { ok: true };
    }

    const chatId = message.chat?.id;
    if (chatId === undefined) {
      return { ok: true };
    }

    const token = randomBytes(24).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.telegramLinkToken.create({
      data: {
        tokenHash,
        chatId: String(chatId),
        username: message.from?.username,
        expiresAt,
      },
    });

    const botUsername = this.config.get<string>(
      'TELEGRAM_BOT_USERNAME',
      'lineup24_bot',
    );
    const frontendUrl = this.frontendBaseUrl();
    // HTML parse_mode — safe for base64url tokens (unlike Markdown _).
    const text = [
      telegramBold('lineup24'),
      '',
      'Привязка Telegram к аккаунту.',
      '',
      'Ваш код:',
      telegramCode(token),
      '',
      `Вставьте его в ${telegramBold('Настройки → Telegram')}.`,
      'Код действует <b>30 минут</b>.',
      '',
      `Кабинет: ${telegramLink('открыть', `${frontendUrl}/dashboard/settings`)}`,
      `Бот: @${escapeTelegramHtml(botUsername)}`,
    ].join('\n');

    await this.sendTelegramHtml(chatId, text, {
      disable_web_page_preview: true,
    });
    return { ok: true };
  }

  async bindTelegram(userId: string, token: string) {
    const cleaned = token.trim();
    if (!cleaned) {
      throw new BadRequestException('Вставьте токен из бота');
    }
    const tokenHash = createHash('sha256').update(cleaned).digest('hex');
    const record = await this.prisma.telegramLinkToken.findFirst({
      where: {
        tokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) {
      throw new BadRequestException(
        'Неверный или просроченный токен. Нажмите /start в боте и скопируйте новый код.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.telegramLinkToken.updateMany({
        where: { id: record.id, consumedAt: null },
        data: { consumedAt: new Date(), userId },
      });
      if (consumed.count === 0) {
        throw new BadRequestException('Token already used');
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          telegramChatId: record.chatId,
          telegramUsername: record.username ?? null,
          telegramLinkedAt: new Date(),
          telegramSignals: true,
        },
      });
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const chatId = Number(record.chatId);
    if (Number.isFinite(chatId)) {
      const settingsUrl = `${this.frontendBaseUrl()}/dashboard/settings`;
      await this.sendTelegramHtml(
        chatId,
        [
          telegramBold('Telegram привязан'),
          '',
          'Сигналы будут приходить сюда.',
          `Управление: ${telegramLink('Настройки', settingsUrl)}`,
        ].join('\n'),
        {
          disable_web_page_preview: true,
          ...this.telegramUrlButton('Открыть настройки', settingsUrl),
        },
      );
    }

    return {
      linked: true,
      telegramUsername: user.telegramUsername,
      telegramLinkedAt: user.telegramLinkedAt,
    };
  }

  async unbindTelegram(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramLinkedAt: null,
        telegramSignals: false,
      },
    });
    return { ok: true };
  }

  async updatePrefs(
    userId: string,
    input: {
      emailSignals?: boolean;
      telegramSignals?: boolean;
      browserPushSignals?: boolean;
    },
  ) {
    if (input.telegramSignals === true) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.telegramChatId) {
        throw new BadRequestException('Link Telegram before enabling signals');
      }
      const hasSub = await this.subscriptionsService.hasActiveSubscription(userId);
      if (!hasSub) {
        throw new BadRequestException(
          'Active subscription is required to enable Telegram signals',
        );
      }
    }

    if (input.browserPushSignals === true) {
      const count = await this.prisma.pushSubscription.count({
        where: { userId },
      });
      if (count === 0) {
        throw new BadRequestException(
          'Subscribe this browser before enabling push notifications',
        );
      }
    }

    const data: {
      emailSignals?: boolean;
      telegramSignals?: boolean;
      browserPushSignals?: boolean;
    } = {};
    if (input.emailSignals !== undefined) {
      data.emailSignals = input.emailSignals;
    }
    if (input.telegramSignals !== undefined) {
      data.telegramSignals = input.telegramSignals;
    }
    if (input.browserPushSignals !== undefined) {
      data.browserPushSignals = input.browserPushSignals;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    if (input.browserPushSignals === false) {
      await this.prisma.pushSubscription.deleteMany({ where: { userId } });
    }

    return {
      emailSignals: user.emailSignals,
      telegramSignals: user.telegramSignals,
      browserPushSignals: user.browserPushSignals,
    };
  }

  getVapidPublicKey() {
    const key = this.config.get<string>('VAPID_PUBLIC_KEY', '').trim();
    if (!key) {
      throw new BadRequestException('Web Push is not configured');
    }
    return { publicKey: key };
  }

  async subscribePush(
    userId: string,
    input: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    },
  ) {
    const row = await this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
      },
      update: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { browserPushSignals: true },
    });

    return { ok: true as const, id: row.id };
  }

  async unsubscribePush(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    const remaining = await this.prisma.pushSubscription.count({
      where: { userId },
    });
    if (remaining === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { browserPushSignals: false },
      });
    }
    return { ok: true as const };
  }

  private configureWebPush() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY', '').trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY', '').trim();
    const subject = this.config
      .get<string>('VAPID_SUBJECT', 'mailto:support@lineup24.ru')
      .trim();
    if (!publicKey || !privateKey) {
      return null;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return webpush;
  }

  private async sendBrowserPush(
    bet: Pick<Bet, 'id' | 'title' | 'publishedAt'>,
  ) {
    const push = this.configureWebPush();
    if (!push) {
      return 0;
    }

    const frontendUrl = this.config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');

    const users = await this.prisma.user.findMany({
      where: {
        browserPushSignals: true,
        blockedAt: null,
        pushSubscriptions: { some: {} },
      },
      select: {
        id: true,
        pushSubscriptions: {
          select: { id: true, endpoint: true, p256dh: true, auth: true },
        },
      },
    });

    const payload = JSON.stringify({
      title: 'Новый сигнал',
      body: bet.title,
      url: `${frontendUrl}/dashboard/signals`,
      betId: bet.id,
    });

    let sent = 0;
    for (const user of users) {
      const active = await this.subscriptionsService.hasActiveSubscription(
        user.id,
      );
      if (!active) continue;

      for (const sub of user.pushSubscriptions) {
        try {
          await push.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          sent += 1;
        } catch (err) {
          const statusCode =
            err && typeof err === 'object' && 'statusCode' in err
              ? Number((err as { statusCode?: number }).statusCode)
              : undefined;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          } else {
            this.logger.warn(
              `Web push failed for ${sub.id}: ${String(err)}`,
            );
          }
        }
      }
    }

    return sent;
  }

  async sendSignalTeaser(bet: Pick<Bet, 'id' | 'title' | 'publishedAt'>) {
    const frontendUrl = this.frontendBaseUrl();
    const signalsUrl = `${frontendUrl}/dashboard/signals`;
    const telegramTeaser = [
      telegramBold('Новый сигнал'),
      '',
      telegramBold(bet.title),
      '',
      'Детали — только в кабинете.',
      telegramLink('Открыть сигнал', signalsUrl),
    ].join('\n');

    const emailRecipients = await this.prisma.user.findMany({
      where: {
        emailSignals: true,
        blockedAt: null,
        subscriptions: {
          some: { status: SubscriptionStatus.ACTIVE },
        },
      },
      select: { id: true, email: true },
    });

    let emailQueued = 0;
    for (const recipient of emailRecipients) {
      const active = await this.subscriptionsService.hasActiveSubscription(
        recipient.id,
      );
      if (!active) {
        continue;
      }
      const sent = await this.mailService.sendSignalTeaser(recipient.email, {
        title: bet.title,
        betId: bet.id,
      });
      if (sent) {
        emailQueued += 1;
      }
    }

    const telegramUsers = await this.prisma.user.findMany({
      where: {
        telegramSignals: true,
        telegramChatId: { not: null },
        blockedAt: null,
      },
      select: { id: true, telegramChatId: true },
    });

    let telegramSent = 0;
    for (const recipient of telegramUsers) {
      const active = await this.subscriptionsService.hasActiveSubscription(
        recipient.id,
      );
      if (!active || !recipient.telegramChatId) {
        continue;
      }
      const chatId = Number(recipient.telegramChatId);
      if (!Number.isFinite(chatId)) {
        continue;
      }
      await this.sendTelegramHtml(chatId, telegramTeaser, {
        disable_web_page_preview: true,
        ...this.telegramUrlButton('Открыть в кабинете', signalsUrl),
      });
      telegramSent += 1;
    }

    let pushSent = 0;
    try {
      pushSent = await this.sendBrowserPush(bet);
    } catch (err) {
      this.logger.warn(`Browser push batch failed: ${String(err)}`);
    }

    return { emailQueued, telegramSent, pushSent };
  }

  async createBroadcast(createdById: string, dto: CreateBroadcastDto) {
    const recipients = await this.resolveBroadcastAudience(dto.audience);
    let sentCount = 0;

    for (const user of recipients) {
      if (dto.audience === BroadcastAudience.EMAIL_OPTED_IN && user.emailSignals) {
        this.logger.log(
          `[broadcast-email-stub] to ${user.email}: ${dto.title}`,
        );
        await this.mailService.sendBroadcast(user.email, dto.title, dto.body);
        sentCount += 1;
      }

      if (
        dto.audience === BroadcastAudience.TELEGRAM_OPTED_IN &&
        user.telegramSignals &&
        user.telegramChatId
      ) {
        const chatId = Number(user.telegramChatId);
        if (Number.isFinite(chatId)) {
          await this.sendTelegramHtml(
            chatId,
            this.formatBroadcastTelegramHtml(dto.title, dto.body),
            { disable_web_page_preview: true },
          );
          sentCount += 1;
        }
      }

      if (dto.audience === BroadcastAudience.ACTIVE_SUBSCRIBERS) {
        const active = await this.subscriptionsService.hasActiveSubscription(
          user.id,
        );
        if (!active) {
          continue;
        }
        if (user.emailSignals) {
          this.logger.log(
            `[broadcast-email-stub] to ${user.email}: ${dto.title}`,
          );
          await this.mailService.sendBroadcast(user.email, dto.title, dto.body);
          sentCount += 1;
        }
        if (user.telegramSignals && user.telegramChatId) {
          const chatId = Number(user.telegramChatId);
          if (Number.isFinite(chatId)) {
            await this.sendTelegramHtml(
              chatId,
              this.formatBroadcastTelegramHtml(dto.title, dto.body),
              { disable_web_page_preview: true },
            );
            sentCount += 1;
          }
        }
      }
    }

    const created = await this.prisma.broadcast.create({
      data: {
        title: dto.title,
        body: dto.body,
        audience: dto.audience,
        createdById,
        sentCount,
      },
      include: {
        recipientUser: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    return this.toPublicBroadcast(created);
  }

  async listBroadcasts(query: ListBroadcastsQueryDto = {}) {
    const where: {
      OR?: Array<{ title: { contains: string; mode: 'insensitive' } } | { body: { contains: string; mode: 'insensitive' } }>;
      audience?: BroadcastAudience | { in: BroadcastAudience[] };
    } = {};

    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query.kind === 'direct') {
      where.audience = BroadcastAudience.DIRECT_USER;
    } else if (query.kind === 'mass') {
      where.audience = {
        in: [
          BroadcastAudience.EMAIL_OPTED_IN,
          BroadcastAudience.TELEGRAM_OPTED_IN,
          BroadcastAudience.ACTIVE_SUBSCRIBERS,
        ],
      };
    }

    if (query.audience) {
      where.audience = query.audience;
    }

    const items = await this.prisma.broadcast.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        recipientUser: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    return items.map((item) => this.toPublicBroadcast(item));
  }

  async emailUser(actorId: string, userId: string, dto: UserEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`[admin-user-email] to ${user.email}: ${dto.title}`);
    await this.mailService.sendBroadcast(user.email, dto.title, dto.body);

    const broadcast = await this.prisma.broadcast.create({
      data: {
        title: dto.title,
        body: dto.body,
        audience: BroadcastAudience.DIRECT_USER,
        createdById: actorId,
        recipientUserId: user.id,
        sentCount: 1,
      },
      include: {
        recipientUser: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    await this.audit.log({
      actorId,
      action: 'notifications.user_email',
      entity: 'User',
      entityId: user.id,
      meta: { title: dto.title, broadcastId: broadcast.id },
    });

    return {
      ok: true as const,
      email: user.email,
      broadcast: this.toPublicBroadcast(broadcast),
    };
  }

  private toPublicBroadcast(item: {
    id: string;
    title: string;
    body: string;
    audience: BroadcastAudience;
    sentCount: number;
    createdAt: Date;
    recipientUser?: {
      id: string;
      username: string;
      email: string;
    } | null;
  }): PublicBroadcast {
    return {
      id: item.id,
      title: item.title,
      body: item.body,
      audience: item.audience,
      sentCount: item.sentCount,
      createdAt: item.createdAt,
      recipient: item.recipientUser
        ? {
            id: item.recipientUser.id,
            username: item.recipientUser.username,
            email: item.recipientUser.email,
          }
        : null,
    };
  }

  private async resolveBroadcastAudience(audience: BroadcastAudience) {
    if (audience === BroadcastAudience.EMAIL_OPTED_IN) {
      return this.prisma.user.findMany({
        where: { emailSignals: true, blockedAt: null },
        select: {
          id: true,
          email: true,
          telegramSignals: true,
          telegramChatId: true,
          emailSignals: true,
        },
      });
    }

    if (audience === BroadcastAudience.TELEGRAM_OPTED_IN) {
      return this.prisma.user.findMany({
        where: {
          telegramSignals: true,
          telegramChatId: { not: null },
          blockedAt: null,
        },
        select: {
          id: true,
          email: true,
          telegramSignals: true,
          telegramChatId: true,
          emailSignals: true,
        },
      });
    }

    return this.prisma.user.findMany({
      where: { blockedAt: null },
      select: {
        id: true,
        email: true,
        telegramSignals: true,
        telegramChatId: true,
        emailSignals: true,
      },
    });
  }

  private frontendBaseUrl(): string {
    return this.config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }

  private formatBroadcastTelegramHtml(title: string, body: string): string {
    return [
      telegramBold(title),
      '',
      escapeTelegramHtml(body),
    ].join('\n');
  }

  /** Inline URL buttons need a public https URL; skip on local http. */
  private telegramUrlButton(
    text: string,
    url: string,
  ): {
    reply_markup?: {
      inline_keyboard: Array<Array<{ text: string; url: string }>>;
    };
  } {
    if (!url.startsWith('https://')) {
      return {};
    }
    return {
      reply_markup: {
        inline_keyboard: [[{ text, url }]],
      },
    };
  }

  private async sendTelegramHtml(
    chatId: number,
    html: string,
    extra?: {
      disable_web_page_preview?: boolean;
      reply_markup?: {
        inline_keyboard: Array<Array<{ text: string; url: string }>>;
      };
    },
  ) {
    return this.sendTelegramMessage(chatId, html, {
      parse_mode: 'HTML',
      ...extra,
    });
  }

  private async sendTelegramMessage(
    chatId: number,
    text: string,
    extra?: {
      parse_mode?: string;
      disable_web_page_preview?: boolean;
      reply_markup?: {
        inline_keyboard: Array<Array<{ text: string; url: string }>>;
      };
    },
  ) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN', '').trim();
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN missing; skipping telegram send');
      return;
    }

    const response = await telegramFetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...extra,
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.warn(
        `Telegram send failed: status=${response.status}${detail ? ` body=${detail.slice(0, 200)}` : ''}`,
      );
    }
  }
}