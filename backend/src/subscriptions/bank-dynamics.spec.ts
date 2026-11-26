import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BetResult,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import {
  BANK_BOOST_START_RUB,
  BANK_BOOST_TARGET_RUB,
  BANK_UNIT_STAKE_RUB,
} from './subscriptions.constants.js';
import { SubscriptionsService } from './subscriptions.service.js';

function subRow(
  overrides: Partial<{
    id: string;
    userId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    bankStartRub: number | null;
    bankCurrentRub: number | null;
    bankTargetRub: number | null;
    startsAt: Date;
    endsAt: Date | null;
    completedAt: Date | null;
  }> = {},
) {
  const startsAt = overrides.startsAt ?? new Date('2026-11-01T10:00:00.000Z');
  return {
    id: overrides.id ?? 'sub1',
    userId: overrides.userId ?? 'u1',
    plan: overrides.plan ?? SubscriptionPlan.BANK_BOOST,
    status: overrides.status ?? SubscriptionStatus.ACTIVE,
    priceRubAtGrant: 1000,
    startsAt,
    endsAt: overrides.endsAt ?? null,
    bankStartRub: overrides.bankStartRub ?? BANK_BOOST_START_RUB,
    bankCurrentRub: overrides.bankCurrentRub ?? BANK_BOOST_START_RUB,
    bankTargetRub:
      overrides.bankTargetRub === undefined
        ? BANK_BOOST_TARGET_RUB
        : overrides.bankTargetRub,
    completedAt: overrides.completedAt ?? null,
    revokedAt: null,
    grantedById: null,
    paymentOrderId: null,
    createdAt: startsAt,
  };
}

describe('Bank dynamics — compute + transitions', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    userSubscription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    subscriptionProduct: { findUnique: vi.fn() },
    bet: { findMany: vi.fn() },
  };
  const config = { get: vi.fn(() => 100) };
  let service: SubscriptionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionsService(prisma as never, config as never);
  });

  it('computeBankFromBets: WON adds stake*(odds-1), LOST subtracts stake', () => {
    // 1000 + 50*(2.0-1) - 50 + 50*(1.8-1) = 1000+50-50+40 = 1040
    const bank = service.computeBankFromBets(BANK_BOOST_START_RUB, [
      { result: BetResult.WON, odds: 2.0 },
      { result: BetResult.LOST, odds: 1.9 },
      { result: BetResult.WON, odds: 1.8 },
    ]);
    expect(bank).toBe(1040);
    expect(BANK_UNIT_STAKE_RUB).toBe(50);
  });

  it('BANK_BOOST: settle path reaches target and completes', async () => {
    // Need +300 from 1000 → six wins at odds 2.0: 6*50 = 300
    const startsAt = new Date('2026-11-01T10:00:00.000Z');
    const row = subRow({
      plan: SubscriptionPlan.BANK_BOOST,
      startsAt,
      bankCurrentRub: 1000,
    });
    prisma.userSubscription.findUnique.mockResolvedValue(row);

    const wins = Array.from({ length: 6 }, (_, i) => ({
      result: BetResult.WON,
      odds: 2.0,
      publishedAt: new Date(startsAt.getTime() + (i + 1) * 60_000),
    }));
    prisma.bet.findMany.mockResolvedValue(wins);
    prisma.userSubscription.update.mockImplementation(async ({ data }) => ({
      ...row,
      ...data,
      bankCurrentRub: data.bankCurrentRub,
      status: data.status ?? row.status,
      completedAt: data.completedAt ?? null,
    }));

    const result = await service.recalculateSubscriptionBank('sub1');

    expect(result?.bankCurrentRub).toBe(1300);
    expect(result?.status).toBe(SubscriptionStatus.COMPLETED);
    expect(prisma.userSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bankCurrentRub: 1300,
          status: SubscriptionStatus.COMPLETED,
        }),
      }),
    );
  });

  it('MONTHLY: bank tracks without target; stays ACTIVE', async () => {
    const startsAt = new Date('2026-11-01T10:00:00.000Z');
    const endsAt = new Date('2026-12-01T10:00:00.000Z');
    const row = subRow({
      plan: SubscriptionPlan.MONTHLY,
      startsAt,
      endsAt,
      bankTargetRub: null,
    });
    prisma.userSubscription.findUnique.mockResolvedValue(row);
    prisma.bet.findMany.mockResolvedValue([
      { result: BetResult.WON, odds: 2.2 },
      { result: BetResult.LOST, odds: 1.5 },
    ]);
    prisma.userSubscription.update.mockImplementation(async ({ data }) => ({
      ...row,
      bankCurrentRub: data.bankCurrentRub,
    }));

    const result = await service.recalculateSubscriptionBank('sub1');

    // 1000 + 50*1.2 - 50 = 1010
    expect(result?.bankCurrentRub).toBe(1010);
    expect(result?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(prisma.userSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { bankCurrentRub: 1010 },
      }),
    );
  });

  it('recalc only counts bets inside subscription window after COMPLETED', async () => {
    const startsAt = new Date('2026-11-01T10:00:00.000Z');
    const completedAt = new Date('2026-11-10T10:00:00.000Z');
    const row = subRow({
      plan: SubscriptionPlan.BANK_BOOST,
      status: SubscriptionStatus.COMPLETED,
      startsAt,
      completedAt,
      bankCurrentRub: 1300,
    });
    prisma.userSubscription.findUnique.mockResolvedValue(row);
    prisma.bet.findMany.mockResolvedValue([
      { result: BetResult.WON, odds: 2.0 },
      { result: BetResult.WON, odds: 2.0 },
    ]);
    prisma.userSubscription.update.mockImplementation(async ({ data }) => ({
      ...row,
      bankCurrentRub: data.bankCurrentRub,
    }));

    await service.recalculateSubscriptionBank('sub1');

    expect(prisma.bet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          publishedAt: {
            gte: startsAt,
            lte: completedAt,
          },
        }),
      }),
    );
  });

  it('grant MONTHLY seeds bank 1000 with null target', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.subscriptionProduct.findUnique.mockResolvedValue({
      code: SubscriptionPlan.MONTHLY,
      priceRub: 2990,
    });
    prisma.userSubscription.findFirst.mockResolvedValue(null);
    // hasActiveSubscription path
    prisma.userSubscription.findMany
      .mockResolvedValueOnce([]) // hasActiveSubscription active
      .mockResolvedValueOnce([]) // after sync
      .mockResolvedValueOnce([]) // countActive candidates
      .mockResolvedValueOnce([]); // countActive refreshed
    prisma.userSubscription.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: 'new-monthly',
      completedAt: null,
      revokedAt: null,
      createdAt: data.startsAt,
    }));

    const created = await service.grant(
      'u1',
      SubscriptionPlan.MONTHLY,
      'admin1',
    );

    expect(created.bankStartRub).toBe(1000);
    expect(created.bankCurrentRub).toBe(1000);
    expect(created.bankTargetRub).toBeNull();
    expect(created.endsAt).not.toBeNull();
  });

  it('hasArchiveEntitlement true for past subscriber without active plan', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.userSubscription.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prisma.userSubscription.count.mockResolvedValue(1);

    await expect(service.hasArchiveEntitlement('u1')).resolves.toBe(true);
  });

  it('getMe exposes usagePeriods for completed MONTHLY', async () => {
    const startsAt = new Date('2026-10-01T00:00:00.000Z');
    const endsAt = new Date('2026-10-31T00:00:00.000Z');
    const completed = subRow({
      id: 'hist1',
      plan: SubscriptionPlan.MONTHLY,
      status: SubscriptionStatus.COMPLETED,
      startsAt,
      endsAt,
      completedAt: endsAt,
      bankTargetRub: null,
      bankCurrentRub: 1120,
    });

    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.userSubscription.findMany
      .mockResolvedValueOnce([completed]) // getMe load
      .mockResolvedValueOnce([completed]) // ensureBankTracking
      .mockResolvedValueOnce([completed]) // getMe refreshed
      .mockResolvedValueOnce([]) // countActive candidates
      .mockResolvedValueOnce([]); // countActive refreshed
    prisma.userSubscription.findUnique.mockResolvedValue(completed);
    prisma.bet.findMany.mockResolvedValue([]);
    prisma.userSubscription.update.mockResolvedValue(completed);

    const me = await service.getMe('u1');

    expect(me.hasActiveSubscription).toBe(false);
    expect(me.hasSubscriptionHistory).toBe(true);
    expect(me.usagePeriods).toEqual([
      expect.objectContaining({
        subscriptionId: 'hist1',
        plan: SubscriptionPlan.MONTHLY,
        startsAt,
        endsAt,
      }),
    ]);
    expect(me.history[0]?.bankCurrentRub).toBe(1120);
  });
});

describe('BetsService watch + settle → bank sync', () => {
  it('update WON publishes event and syncs banks', async () => {
    const { BetsService } = await import('../bets/bets.service.js');
    const prisma = {
      bet: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'b1',
          title: 'T',
          forecast: 'F',
          odds: 1.9,
          score: null,
          comment: null,
          result: BetResult.PENDING,
          publishedAt: new Date('2026-11-20T12:00:00.000Z'),
          createdAt: new Date('2026-11-20T12:00:00.000Z'),
          updatedAt: new Date('2026-11-20T12:00:00.000Z'),
          createdById: 'admin',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'b1',
          title: 'T',
          forecast: 'F',
          odds: 1.9,
          score: '2:1',
          comment: null,
          result: BetResult.WON,
          publishedAt: new Date('2026-11-20T12:00:00.000Z'),
          createdAt: new Date('2026-11-20T12:00:00.000Z'),
          updatedAt: new Date('2026-11-20T13:00:00.000Z'),
          createdById: 'admin',
        }),
      },
    };
    const notificationsService = { sendSignalTeaser: vi.fn() };
    const watchHub = { publish: vi.fn(), waitForEvent: vi.fn() };
    const subscriptionsService = {
      syncBanksAfterBetMutation: vi.fn().mockResolvedValue(undefined),
    };
    const service = new BetsService(
      prisma as never,
      notificationsService as never,
      watchHub as never,
      subscriptionsService as never,
    );

    const updated = await service.update('b1', {
      result: BetResult.WON,
      score: '2:1',
    });

    expect(updated.result).toBe(BetResult.WON);
    expect(subscriptionsService.syncBanksAfterBetMutation).toHaveBeenCalled();
    expect(watchHub.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'updated',
        betId: 'b1',
      }),
    );
  });

  it('watch returns updated bets when only updatedAt advances', async () => {
    const { BetsService } = await import('../bets/bets.service.js');
    const since = new Date('2026-11-20T12:00:00.000Z');
    const bet = {
      id: 'b1',
      title: 'T',
      forecast: 'F',
      odds: 1.9,
      score: '2:1',
      comment: null,
      result: BetResult.WON,
      publishedAt: new Date('2026-11-19T10:00:00.000Z'),
      createdAt: new Date('2026-11-19T10:00:00.000Z'),
      updatedAt: new Date('2026-11-20T13:00:00.000Z'),
      createdById: 'admin',
    };
    const prisma = {
      bet: {
        findMany: vi.fn().mockResolvedValue([bet]),
      },
    };
    const service = new BetsService(
      prisma as never,
      { sendSignalTeaser: vi.fn() } as never,
      { publish: vi.fn(), waitForEvent: vi.fn() } as never,
      { syncBanksAfterBetMutation: vi.fn() } as never,
    );

    const response = await service.watch(
      { since: since.toISOString(), timeoutMs: 1000 },
      'user1',
    );

    expect(response.items).toHaveLength(0);
    expect(response.updated).toHaveLength(1);
    expect(response.updated[0]?.result).toBe(BetResult.WON);
    expect(response.bankRevision).toBeNull();
  });
});
