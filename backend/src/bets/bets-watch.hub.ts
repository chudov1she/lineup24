import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'node:events';
import { Redis } from 'ioredis';
import type { PublicBet } from './bets.service.js';

const CHANNEL = 'bets:events';

export type BetWatchAction = 'created' | 'updated' | 'deleted';

export type BetWatchEvent = {
  action: BetWatchAction;
  betId: string;
  bet?: PublicBet;
  /** ISO timestamp — advances client cursors for updates/deletes. */
  at: string;
};

@Injectable()
export class BetsWatchHub implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BetsWatchHub.name);
  private readonly local = new EventEmitter();
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    this.local.setMaxListeners(200);
  }

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL', '').trim();
    if (!url) {
      this.logger.warn('REDIS_URL missing — bets watch hub is local-only');
      return;
    }

    try {
      this.publisher = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
      this.subscriber = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      await this.subscriber.subscribe(CHANNEL);
      this.subscriber.on('message', (channel, message) => {
        if (channel !== CHANNEL) return;
        try {
          const event = JSON.parse(message) as BetWatchEvent;
          this.local.emit('event', event);
        } catch (err) {
          this.logger.warn(`Invalid bets:events payload: ${String(err)}`);
        }
      });
      this.logger.log(`Subscribed to Redis channel ${CHANNEL}`);
    } catch (err) {
      this.logger.error(`Redis hub init failed: ${String(err)}`);
      await this.closeRedis();
    }
  }

  async onModuleDestroy() {
    await this.closeRedis();
    this.local.removeAllListeners();
  }

  async publish(event: BetWatchEvent) {
    this.local.emit('event', event);
    if (!this.publisher) return;
    try {
      await this.publisher.publish(CHANNEL, JSON.stringify(event));
    } catch (err) {
      this.logger.warn(`Redis publish failed: ${String(err)}`);
    }
  }

  /** Wake any waiter on create/update/delete (bank + live signal dynamics). */
  waitForEvent(signal: AbortSignal): Promise<BetWatchEvent | null> {
    return new Promise((resolve) => {
      if (signal.aborted) {
        resolve(null);
        return;
      }

      const onEvent = (event: BetWatchEvent) => {
        cleanup();
        resolve(event);
      };

      const onAbort = () => {
        cleanup();
        resolve(null);
      };

      const cleanup = () => {
        this.local.off('event', onEvent);
        signal.removeEventListener('abort', onAbort);
      };

      this.local.on('event', onEvent);
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  private async closeRedis() {
    const close = async (client: Redis | null) => {
      if (!client) return;
      try {
        client.disconnect();
      } catch {
        // ignore
      }
    };
    await Promise.all([close(this.publisher), close(this.subscriber)]);
    this.publisher = null;
    this.subscriber = null;
  }
}
