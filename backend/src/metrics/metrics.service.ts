import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BetResult,
  PaymentOrderStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

type DayPoint = { date: string; value: number };

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const MAX_RANGE_DAYS = 90;
const HOMEPAGE_PATH = '/';

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function parseDay(input: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) {
    throw new BadRequestException('Invalid date format, use YYYY-MM-DD');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException('Invalid calendar date');
  }
  return parsed;
}

function emptyDays(from: Date, to: Date): Map<string, number> {
  const map = new Map<string, number>();
  const cursor = new Date(from);
  while (cursor <= to) {
    map.set(dayKey(cursor), 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return map;
}

function toSeries(map: Map<string, number>): DayPoint[] {
  return [...map.entries()].map(([date, value]) => ({ date, value }));
}

function resolveRange(fromRaw?: string, toRaw?: string): { from: Date; to: Date } {
  const today = utcStartOfDay(new Date());
  const to = toRaw ? parseDay(toRaw) : today;
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  const from = fromRaw ? parseDay(fromRaw) : defaultFrom;

  if (from > to) {
    throw new BadRequestException('`from` must be on or before `to`');
  }

  const spanDays =
    Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (spanDays > MAX_RANGE_DAYS) {
    throw new BadRequestException(`Period must be at most ${MAX_RANGE_DAYS} days`);
  }

  return { from, to };
}

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async snapshot(fromRaw?: string, toRaw?: string) {
    const { from, to } = resolveRange(fromRaw, toRaw);
    const toExclusive = new Date(to);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);

    const [
      usersTotal,
      betsTotal,
      blockedUsers,
      activeSubscriberUsers,
      onlineGroups,
      activeUsersInPeriod,
      revenuePaidAll,
      revenuePaidPeriod,
      grantsAll,
      grantsPeriod,
      recentUsers,
      recentActivityUsers,
      recentBets,
      recentPaid,
      betsByResultRows,
      pendingBets,
      homepageUniquesToday,
      homepageUniquesInPeriod,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.bet.count(),
      this.prisma.user.count({ where: { blockedAt: { not: null } } }),
      this.subscriptionsService.countActiveSubscriberUsers(),
      this.prisma.session.groupBy({
        by: ['userId'],
        where: {
          revokedAt: null,
          expiresAt: { gt: new Date() },
          lastSeenAt: { gte: onlineSince },
        },
      }),
      this.prisma.user.count({
        where: {
          lastActivityAt: { gte: from, lt: toExclusive },
        },
      }),
      this.prisma.paymentOrder.aggregate({
        where: { status: PaymentOrderStatus.PAID },
        _sum: { amountRub: true },
        _count: { id: true },
      }),
      this.prisma.paymentOrder.aggregate({
        where: {
          status: PaymentOrderStatus.PAID,
          paidAt: { gte: from, lt: toExclusive },
        },
        _sum: { amountRub: true },
        _count: { id: true },
      }),
      this.prisma.userSubscription.aggregate({
        where: {
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.COMPLETED],
          },
          revokedAt: null,
        },
        _sum: { priceRubAtGrant: true },
        _count: { id: true },
      }),
      this.prisma.userSubscription.aggregate({
        where: {
          createdAt: { gte: from, lt: toExclusive },
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.COMPLETED],
          },
          revokedAt: null,
        },
        _sum: { priceRubAtGrant: true },
        _count: { id: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: from, lt: toExclusive } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: { lastActivityAt: { gte: from, lt: toExclusive } },
        select: { lastActivityAt: true },
      }),
      this.prisma.bet.findMany({
        where: { publishedAt: { gte: from, lt: toExclusive } },
        select: { publishedAt: true, result: true },
      }),
      this.prisma.paymentOrder.findMany({
        where: {
          status: PaymentOrderStatus.PAID,
          paidAt: { gte: from, lt: toExclusive },
        },
        select: { paidAt: true, amountRub: true },
      }),
      this.prisma.bet.groupBy({
        by: ['result'],
        _count: { _all: true },
      }),
      this.prisma.bet.count({ where: { result: BetResult.PENDING } }),
      this.analyticsService.countUniquesToday(HOMEPAGE_PATH),
      this.analyticsService.countUniques(HOMEPAGE_PATH, from, to),
    ]);

    const usersDaily = emptyDays(from, to);
    for (const user of recentUsers) {
      const key = dayKey(user.createdAt);
      if (usersDaily.has(key)) {
        usersDaily.set(key, (usersDaily.get(key) ?? 0) + 1);
      }
    }

    const activityDaily = emptyDays(from, to);
    for (const user of recentActivityUsers) {
      if (!user.lastActivityAt) continue;
      const key = dayKey(user.lastActivityAt);
      if (activityDaily.has(key)) {
        activityDaily.set(key, (activityDaily.get(key) ?? 0) + 1);
      }
    }

    const betsDaily = emptyDays(from, to);
    const wonDaily = emptyDays(from, to);
    const lostDaily = emptyDays(from, to);
    for (const bet of recentBets) {
      const key = dayKey(bet.publishedAt);
      if (!betsDaily.has(key)) continue;
      betsDaily.set(key, (betsDaily.get(key) ?? 0) + 1);
      if (bet.result === BetResult.WON) {
        wonDaily.set(key, (wonDaily.get(key) ?? 0) + 1);
      } else if (bet.result === BetResult.LOST) {
        lostDaily.set(key, (lostDaily.get(key) ?? 0) + 1);
      }
    }

    const revenuePaidDaily = emptyDays(from, to);
    for (const order of recentPaid) {
      if (!order.paidAt) continue;
      const key = dayKey(order.paidAt);
      if (!revenuePaidDaily.has(key)) continue;
      revenuePaidDaily.set(
        key,
        (revenuePaidDaily.get(key) ?? 0) + order.amountRub,
      );
    }

    const betsByResult = {
      PENDING: 0,
      WON: 0,
      LOST: 0,
    };
    for (const row of betsByResultRows) {
      betsByResult[row.result] = row._count._all;
    }

    const settled = betsByResult.WON + betsByResult.LOST;
    const hitRate =
      settled > 0 ? Math.round((betsByResult.WON / settled) * 100) : 0;

    const seatLimit = this.subscriptionsService.seatLimit();

    return {
      period: {
        from: dayKey(from),
        to: dayKey(to),
      },
      onlineNow: onlineGroups.length,
      activeUsersInPeriod,
      usersTotal,
      activeSubscriberUsers,
      betsTotal,
      pendingBets,
      blockedUsers,
      revenuePaidRub: revenuePaidAll._sum.amountRub ?? 0,
      revenuePaidInPeriod: revenuePaidPeriod._sum.amountRub ?? 0,
      paidOrdersInPeriod: revenuePaidPeriod._count.id,
      grantsCount: grantsAll._count.id,
      grantsRub: grantsAll._sum.priceRubAtGrant ?? 0,
      grantsCountInPeriod: grantsPeriod._count.id,
      grantsRubInPeriod: grantsPeriod._sum.priceRubAtGrant ?? 0,
      /** @deprecated use grantsRub — kept for older clients */
      revenueRubProxy: grantsAll._sum.priceRubAtGrant ?? 0,
      homepageUniquesToday,
      homepageUniquesInPeriod,
      hitRate,
      seats: {
        used: activeSubscriberUsers,
        limit: seatLimit,
      },
      betsByResult,
      series: {
        activityDaily: toSeries(activityDaily),
        usersDaily: toSeries(usersDaily),
        betsDaily: toSeries(betsDaily),
        wonDaily: toSeries(wonDaily),
        lostDaily: toSeries(lostDaily),
        revenuePaidDaily: toSeries(revenuePaidDaily),
      },
    };
  }
}
