import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BetResult,
  Prisma,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
  type UserSubscription,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  BANK_BOOST_START_RUB,
  BANK_BOOST_TARGET_RUB,
  BANK_UNIT_STAKE_RUB,
  DEFAULT_SUBSCRIPTION_SEAT_LIMIT,
  MONTHLY_DURATION_DAYS,
} from './subscriptions.constants.js';

export type PublicSubscription = {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  priceRubAtGrant: number;
  startsAt: Date;
  endsAt: Date | null;
  bankStartRub: number | null;
  bankCurrentRub: number | null;
  bankTargetRub: number | null;
  completedAt: Date | null;
  revokedAt: Date | null;
  grantedById: string | null;
  createdAt: Date;
  isActive: boolean;
};

export type SubscriptionUsagePeriod = {
  subscriptionId: string;
  plan: SubscriptionPlan;
  startsAt: Date;
  endsAt: Date | null;
};

export type SubscriptionMeResponse = {
  hasActiveSubscription: boolean;
  /** True if user ever had a subscription (for archive/stats after expiry). */
  hasSubscriptionHistory: boolean;
  activePlans: SubscriptionPlan[];
  activeSubscriptions: PublicSubscription[];
  history: PublicSubscription[];
  /** Inclusive windows for archive/stats while/after the plan. */
  usagePeriods: SubscriptionUsagePeriod[];
  seats: { used: number; limit: number };
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  seatLimit(): number {
    const raw = this.config.get<string | number>('SUBSCRIPTION_SEAT_LIMIT');
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
    return DEFAULT_SUBSCRIPTION_SEAT_LIMIT;
  }

  toPublic(sub: UserSubscription, now = new Date()): PublicSubscription {
    return {
      id: sub.id,
      userId: sub.userId,
      plan: sub.plan,
      status: sub.status,
      priceRubAtGrant: sub.priceRubAtGrant,
      startsAt: sub.startsAt,
      endsAt: sub.endsAt,
      bankStartRub: sub.bankStartRub,
      bankCurrentRub: sub.bankCurrentRub,
      bankTargetRub: sub.bankTargetRub,
      completedAt: sub.completedAt,
      revokedAt: sub.revokedAt,
      grantedById: sub.grantedById,
      createdAt: sub.createdAt,
      isActive: this.isSubscriptionActive(sub, now),
    };
  }

  isSubscriptionActive(sub: UserSubscription, now = new Date()): boolean {
    if (sub.status !== SubscriptionStatus.ACTIVE) {
      return false;
    }

    if (sub.plan === SubscriptionPlan.MONTHLY) {
      return sub.endsAt !== null && sub.endsAt > now;
    }

    if (sub.plan === SubscriptionPlan.BANK_BOOST) {
      if (sub.bankCurrentRub === null || sub.bankTargetRub === null) {
        return false;
      }
      return sub.bankCurrentRub < sub.bankTargetRub;
    }

    return false;
  }

  listProducts() {
    return this.prisma.subscriptionProduct.findMany({
      orderBy: { priceRub: 'asc' },
    });
  }

  async getMe(userId: string): Promise<SubscriptionMeResponse> {
    const now = new Date();
    const [user, subscriptions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
      this.prisma.userSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    await this.syncExpiredMonthly(subscriptions, now);
    await this.ensureBankTracking(userId);

    const refreshed = await this.prisma.userSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const publicSubs = refreshed.map((item) => this.toPublic(item, now));
    let activeSubscriptions = publicSubs.filter((item) => item.isActive);
    let activePlans = [...new Set(activeSubscriptions.map((item) => item.plan))];
    let hasActiveSubscription = activeSubscriptions.length > 0;

    // Admins always have unlimited lifetime bank (not a 1300 boost plan).
    if (user?.role === Role.ADMIN) {
      hasActiveSubscription = true;
      const lifetime = await this.adminLifetimeAccess(userId, now);
      activeSubscriptions = [
        lifetime,
        ...activeSubscriptions.filter(
          (item) => !item.id.startsWith('admin-lifetime-'),
        ),
      ];
      activePlans = [...new Set([lifetime.plan, ...activePlans])];
    }

    return {
      hasActiveSubscription,
      hasSubscriptionHistory: publicSubs.length > 0 || user?.role === Role.ADMIN,
      activePlans,
      activeSubscriptions,
      history: publicSubs,
      usagePeriods: this.toUsagePeriods(publicSubs, now),
      seats: {
        used: await this.countActiveSubscriberUsers(),
        limit: this.seatLimit(),
      },
    };
  }

  /** Past or present subscriber may open archive/stats for their usage windows. */
  async hasArchiveEntitlement(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === Role.ADMIN) return true;
    if (await this.hasActiveSubscription(userId)) return true;
    const count = await this.prisma.userSubscription.count({
      where: { userId },
    });
    return count > 0;
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === Role.ADMIN) {
      return true;
    }

    const now = new Date();
    const subscriptions = await this.prisma.userSubscription.findMany({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    await this.syncExpiredMonthly(subscriptions, now);

    const refreshed = await this.prisma.userSubscription.findMany({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    return refreshed.some((item) => this.isSubscriptionActive(item, now));
  }

  /**
   * Virtual unlimited admin bank — all settled bets, no 1300 target.
   * Stored as MONTHLY shape so UI does not treat it as boost-to-goal.
   */
  private async adminLifetimeAccess(
    userId: string,
    now = new Date(),
  ): Promise<PublicSubscription> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    const settled = await this.prisma.bet.findMany({
      where: {
        result: { in: [BetResult.WON, BetResult.LOST] },
      },
      orderBy: { publishedAt: 'asc' },
      select: { odds: true, result: true, publishedAt: true },
    });

    const startsAt =
      settled[0]?.publishedAt ?? user?.createdAt ?? now;

    const bank = Math.max(
      0,
      this.computeBankFromBets(BANK_BOOST_START_RUB, settled),
    );

    return {
      id: `admin-lifetime-${userId}`,
      userId,
      plan: SubscriptionPlan.MONTHLY,
      status: SubscriptionStatus.ACTIVE,
      priceRubAtGrant: 0,
      startsAt,
      endsAt: null,
      bankStartRub: BANK_BOOST_START_RUB,
      bankCurrentRub: bank,
      bankTargetRub: null,
      completedAt: null,
      revokedAt: null,
      grantedById: null,
      createdAt: startsAt,
      isActive: true,
    };
  }

  computeBankFromBets(
    startRub: number,
    bets: Array<{
      result: BetResult;
      odds: { toString(): string } | number;
    }>,
  ): number {
    let bank = startRub;
    for (const bet of bets) {
      if (bet.result === BetResult.WON) {
        bank += BANK_UNIT_STAKE_RUB * (Number(bet.odds) - 1);
      } else if (bet.result === BetResult.LOST) {
        bank -= BANK_UNIT_STAKE_RUB;
      }
    }
    return Math.round(bank);
  }

  /**
   * Backfill bank fields for plans that predate auto-tracking,
   * then recalculate current from settled bets in the subscription window.
   */
  async ensureBankTracking(userId: string): Promise<void> {
    const rows = await this.prisma.userSubscription.findMany({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.COMPLETED],
        },
      },
    });

    for (const row of rows) {
      if (row.bankStartRub === null) {
        await this.prisma.userSubscription.update({
          where: { id: row.id },
          data: {
            bankStartRub: BANK_BOOST_START_RUB,
            bankCurrentRub: BANK_BOOST_START_RUB,
            bankTargetRub:
              row.plan === SubscriptionPlan.BANK_BOOST
                ? (row.bankTargetRub ?? BANK_BOOST_TARGET_RUB)
                : null,
          },
        });
      }
      await this.recalculateSubscriptionBank(row.id);
    }
  }

  /** Recalculate bank for every subscription that tracks a curve. */
  async syncBanksAfterBetMutation(): Promise<void> {
    const rows = await this.prisma.userSubscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.COMPLETED],
        },
        bankStartRub: { not: null },
      },
      select: { id: true },
    });
    for (const row of rows) {
      await this.recalculateSubscriptionBank(row.id);
    }
  }

  async recalculateSubscriptionBank(
    subscriptionId: string,
  ): Promise<PublicSubscription | null> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!subscription || subscription.bankStartRub === null) {
      return null;
    }
    if (subscription.status === SubscriptionStatus.REVOKED) {
      return this.toPublic(subscription);
    }

    // Freeze bank after plan ends: MONTHLY → endsAt; BOOST → completedAt.
    const windowEnd =
      subscription.status === SubscriptionStatus.ACTIVE
        ? null
        : subscription.completedAt ??
          subscription.endsAt ??
          subscription.revokedAt;

    const settled = await this.prisma.bet.findMany({
      where: {
        result: { in: [BetResult.WON, BetResult.LOST] },
        publishedAt: {
          gte: subscription.startsAt,
          ...(windowEnd ? { lte: windowEnd } : {}),
        },
      },
      select: { result: true, odds: true, publishedAt: true },
      orderBy: { publishedAt: 'asc' },
    });

    const bankCurrentRub = Math.max(
      0,
      this.computeBankFromBets(subscription.bankStartRub, settled),
    );

    const target = subscription.bankTargetRub;
    const reachedTarget =
      subscription.plan === SubscriptionPlan.BANK_BOOST &&
      target !== null &&
      bankCurrentRub >= target;

    const shouldComplete =
      reachedTarget && subscription.status === SubscriptionStatus.ACTIVE;

    // Freeze at the last settled bet that produced the target (not wall clock),
    // so a later ensureBankTracking pass keeps the same window.
    const lastSettledAt =
      settled[settled.length - 1]?.publishedAt ?? new Date();

    const updated = await this.prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        bankCurrentRub,
        ...(shouldComplete
          ? {
              status: SubscriptionStatus.COMPLETED,
              completedAt: lastSettledAt,
            }
          : {}),
      },
    });
    return this.toPublic(updated);
  }

  private toUsagePeriods(
    subscriptions: PublicSubscription[],
    now: Date,
  ): SubscriptionUsagePeriod[] {
    return subscriptions
      .filter((item) => item.status !== SubscriptionStatus.REVOKED)
      .map((item) => {
        const endsAt =
          item.completedAt ??
          item.endsAt ??
          (item.isActive ? null : now);
        return {
          subscriptionId: item.id,
          plan: item.plan,
          startsAt: item.startsAt,
          endsAt,
        };
      });
  }

  async countActiveSubscriberUsers(): Promise<number> {
    const now = new Date();
    const candidates = await this.prisma.userSubscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
    });
    await this.syncExpiredMonthly(candidates, now);

    const refreshed = await this.prisma.userSubscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    const activeUserIds = new Set<string>();
    for (const item of refreshed) {
      if (this.isSubscriptionActive(item, now)) {
        activeUserIds.add(item.userId);
      }
    }
    return activeUserIds.size;
  }

  async grant(
    userId: string,
    plan: SubscriptionPlan,
    grantedById: string | null,
    options?: { paymentOrderId?: string; tx?: Prisma.TransactionClient },
  ): Promise<PublicSubscription> {
    const db = options?.tx ?? this.prisma;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const product = await db.subscriptionProduct.findUnique({
      where: { code: plan },
    });
    if (!product) {
      throw new NotFoundException('Subscription product not found');
    }

    if (options?.paymentOrderId) {
      const existing = await db.userSubscription.findFirst({
        where: { paymentOrderId: options.paymentOrderId },
      });
      if (existing) {
        return this.toPublic(existing);
      }
    }

    const alreadyActive = await this.hasActiveSubscription(userId);
    if (!alreadyActive) {
      const used = await this.countActiveSubscriberUsers();
      if (used >= this.seatLimit()) {
        throw new ConflictException(
          'Нет свободных мест подписки. Дождитесь освобождения места.',
        );
      }
    }

    const startsAt = new Date();
    const data =
      plan === SubscriptionPlan.BANK_BOOST
        ? {
            userId,
            plan,
            status: SubscriptionStatus.ACTIVE,
            priceRubAtGrant: product.priceRub,
            startsAt,
            endsAt: null as Date | null,
            bankStartRub: BANK_BOOST_START_RUB,
            bankCurrentRub: BANK_BOOST_START_RUB,
            bankTargetRub: BANK_BOOST_TARGET_RUB,
            grantedById,
            paymentOrderId: options?.paymentOrderId ?? null,
          }
        : {
            userId,
            plan,
            status: SubscriptionStatus.ACTIVE,
            priceRubAtGrant: product.priceRub,
            startsAt,
            endsAt: this.addDays(startsAt, MONTHLY_DURATION_DAYS),
            bankStartRub: BANK_BOOST_START_RUB,
            bankCurrentRub: BANK_BOOST_START_RUB,
            bankTargetRub: null as number | null,
            grantedById,
            paymentOrderId: options?.paymentOrderId ?? null,
          };

    const created = await db.userSubscription.create({ data });
    return this.toPublic(created);
  }

  async updateBankCurrent(
    id: string,
    bankCurrentRub: number,
  ): Promise<PublicSubscription> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.bankStartRub === null) {
      throw new BadRequestException(
        'Bank balance is not tracked for this subscription',
      );
    }

    const target = subscription.bankTargetRub;
    const reachedTarget =
      subscription.plan === SubscriptionPlan.BANK_BOOST &&
      target !== null &&
      bankCurrentRub >= target;

    const updated = await this.prisma.userSubscription.update({
      where: { id },
      data: {
        bankCurrentRub,
        ...(reachedTarget && subscription.status === SubscriptionStatus.ACTIVE
          ? {
              status: SubscriptionStatus.COMPLETED,
              completedAt: new Date(),
            }
          : {}),
      },
    });
    return this.toPublic(updated);
  }

  async revoke(id: string): Promise<PublicSubscription> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const updated = await this.prisma.userSubscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
    return this.toPublic(updated);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private async syncExpiredMonthly(
    subscriptions: Array<Pick<UserSubscription, 'id' | 'plan' | 'status' | 'endsAt'>>,
    now: Date,
  ) {
    const expiredIds = subscriptions
      .filter(
        (item) =>
          item.plan === SubscriptionPlan.MONTHLY &&
          item.status === SubscriptionStatus.ACTIVE &&
          item.endsAt !== null &&
          item.endsAt <= now,
      )
      .map((item) => item.id);

    if (expiredIds.length === 0) {
      return;
    }

    for (const id of expiredIds) {
      const row = subscriptions.find((item) => item.id === id);
      await this.prisma.userSubscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.COMPLETED,
          // Freeze bank at plan end, not at sync clock.
          completedAt: row?.endsAt ?? now,
        },
      });
    }
  }
}
