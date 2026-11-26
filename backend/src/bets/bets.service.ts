import { Injectable, NotFoundException } from '@nestjs/common';
import { BetResult, type Bet, type Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { BetsWatchHub } from './bets-watch.hub.js';
import { CreateBetDto } from './dto/create-bet.dto.js';
import type { ListBetsQueryDto } from './dto/list-bets-query.dto.js';
import { UpdateBetDto } from './dto/update-bet.dto.js';
import type { WatchBetsQueryDto } from './dto/watch-bets-query.dto.js';

export type PublicBet = {
  id: string;
  title: string;
  forecast: string;
  odds: number;
  score: string | null;
  comment: string | null;
  result: BetResult;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  /** Per-user leak-trace marker (ops anti-parse) */
  wm?: string;
};

export type WatchBetsResponse = {
  /** New bets since cursor (toast / unseen). */
  items: PublicBet[];
  /** Settled or edited bets that already existed (bank curve / list upsert). */
  updated: PublicBet[];
  deletedIds: string[];
  /** ISO — bump when bank was recalculated so clients refetch /subscriptions/me. */
  bankRevision: string | null;
  serverTime: string;
};

@Injectable()
export class BetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly watchHub: BetsWatchHub,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  toPublic(bet: Bet, userId?: string): PublicBet {
    return {
      id: bet.id,
      title: bet.title,
      forecast: bet.forecast,
      odds: Number(bet.odds),
      score: bet.score,
      comment: bet.comment,
      result: bet.result,
      publishedAt: bet.publishedAt,
      createdAt: bet.createdAt,
      updatedAt: bet.updatedAt,
      ...(userId
        ? { wm: Buffer.from(`${userId}:${bet.id}`).toString('base64url').slice(0, 12) }
        : {}),
    };
  }

  async list(query: ListBetsQueryDto = {}, userId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BetWhereInput = {};
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { forecast: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (query.result) {
      where.result = query.result;
    }
    if (query.period && query.period !== 'all') {
      const days = query.period === '7d' ? 7 : query.period === '30d' ? 30 : 90;
      const from = new Date();
      from.setDate(from.getDate() - days);
      where.publishedAt = { gte: from };
    }

    const [items, total] = await Promise.all([
      this.prisma.bet.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bet.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((bet) => this.toPublic(bet, userId)),
    };
  }

  /** Public settled archive — no auth, no comments, no PENDING. */
  async listArchive(query: { page?: number; limit?: number } = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 40;
    const skip = (page - 1) * limit;
    const where: Prisma.BetWhereInput = {
      result: { in: [BetResult.WON, BetResult.LOST] },
    };

    const [items, total, won, lost] = await Promise.all([
      this.prisma.bet.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          forecast: true,
          odds: true,
          score: true,
          result: true,
          publishedAt: true,
        },
      }),
      this.prisma.bet.count({ where }),
      this.prisma.bet.count({ where: { result: BetResult.WON } }),
      this.prisma.bet.count({ where: { result: BetResult.LOST } }),
    ]);

    return {
      page,
      limit,
      total,
      won,
      lost,
      hitRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
      items: items.map((bet) => ({
        id: bet.id,
        title: bet.title,
        forecast: bet.forecast,
        odds: Number(bet.odds),
        score: bet.score,
        result: bet.result,
        publishedAt: bet.publishedAt,
      })),
    };
  }

  async findById(id: string, userId?: string): Promise<PublicBet> {
    const bet = await this.prisma.bet.findUnique({ where: { id } });
    if (!bet) {
      throw new NotFoundException('Bet not found');
    }
    return this.toPublic(bet, userId);
  }

  async watch(
    query: WatchBetsQueryDto,
    userId: string,
    requestSignal?: AbortSignal,
  ): Promise<WatchBetsResponse> {
    const since = query.since ? new Date(query.since) : new Date(0);
    const timeoutMs = query.timeoutMs ?? 25_000;
    const serverTime = () => new Date().toISOString();

    const pack = async (
      deletedIds: string[] = [],
      bankRevision: string | null = null,
    ): Promise<WatchBetsResponse> => {
      const changed = await this.prisma.bet.findMany({
        where: {
          OR: [{ publishedAt: { gt: since } }, { updatedAt: { gt: since } }],
        },
        orderBy: { updatedAt: 'asc' },
        take: 40,
      });

      const items: PublicBet[] = [];
      const updated: PublicBet[] = [];
      for (const bet of changed) {
        const pub = this.toPublic(bet, userId);
        if (bet.createdAt.getTime() > since.getTime()) {
          items.push(pub);
        } else {
          updated.push(pub);
        }
      }

      return {
        items,
        updated,
        deletedIds,
        bankRevision,
        serverTime: serverTime(),
      };
    };

    const immediate = await pack();
    if (
      immediate.items.length > 0 ||
      immediate.updated.length > 0
    ) {
      return immediate;
    }

    const ac = new AbortController();
    const onAbort = () => ac.abort();
    requestSignal?.addEventListener('abort', onAbort, { once: true });

    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const event = await this.watchHub.waitForEvent(ac.signal);
      if (!event) {
        return {
          items: [],
          updated: [],
          deletedIds: [],
          bankRevision: null,
          serverTime: serverTime(),
        };
      }

      const deletedIds =
        event.action === 'deleted' ? [event.betId] : [];
      const bankRevision =
        event.action === 'updated' || event.action === 'deleted'
          ? event.at
          : null;

      return pack(deletedIds, bankRevision);
    } finally {
      clearTimeout(timer);
      requestSignal?.removeEventListener('abort', onAbort);
    }
  }

  async create(dto: CreateBetDto, createdById: string): Promise<PublicBet> {
    const bet = await this.prisma.bet.create({
      data: {
        title: dto.title,
        forecast: dto.forecast,
        odds: dto.odds,
        score: dto.score,
        comment: dto.comment,
        result: dto.result ?? BetResult.PENDING,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        createdById,
      },
    });

    const publicBet = this.toPublic(bet);

    if (
      bet.result === BetResult.WON ||
      bet.result === BetResult.LOST
    ) {
      await this.subscriptionsService.syncBanksAfterBetMutation();
    }

    void this.watchHub.publish({
      action: 'created',
      betId: publicBet.id,
      bet: publicBet,
      at: publicBet.updatedAt.toISOString(),
    });

    try {
      await this.notificationsService.sendSignalTeaser(bet);
    } catch {
      // Notification failures must not block bet creation.
    }

    return publicBet;
  }

  async update(id: string, dto: UpdateBetDto): Promise<PublicBet> {
    const existing = await this.prisma.bet.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Bet not found');
    }

    const data: Prisma.BetUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.forecast !== undefined) data.forecast = dto.forecast;
    if (dto.odds !== undefined) data.odds = dto.odds;
    if (dto.score !== undefined) data.score = dto.score;
    if (dto.comment !== undefined) data.comment = dto.comment;
    if (dto.result !== undefined) data.result = dto.result;
    if (dto.publishedAt !== undefined) {
      data.publishedAt = new Date(dto.publishedAt);
    }

    const bet = await this.prisma.bet.update({
      where: { id },
      data,
    });
    const publicBet = this.toPublic(bet);

    const resultChanged =
      dto.result !== undefined && dto.result !== existing.result;
    const oddsChanged =
      dto.odds !== undefined && Number(dto.odds) !== Number(existing.odds);
    if (
      resultChanged ||
      oddsChanged ||
      bet.result === BetResult.WON ||
      bet.result === BetResult.LOST
    ) {
      await this.subscriptionsService.syncBanksAfterBetMutation();
    }

    void this.watchHub.publish({
      action: 'updated',
      betId: publicBet.id,
      bet: publicBet,
      at: publicBet.updatedAt.toISOString(),
    });

    return publicBet;
  }

  async remove(id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.bet.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Bet not found');
    }
    await this.prisma.bet.delete({ where: { id } });

    if (
      existing.result === BetResult.WON ||
      existing.result === BetResult.LOST
    ) {
      await this.subscriptionsService.syncBanksAfterBetMutation();
    }

    void this.watchHub.publish({
      action: 'deleted',
      betId: id,
      at: new Date().toISOString(),
    });

    return { ok: true };
  }
}
