import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service.js';

describe('SubscriptionsService.updateBankCurrent', () => {
  const prisma = {
    userSubscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  const config = { get: vi.fn(() => 100) };
  let service: SubscriptionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionsService(prisma as never, config as never);
  });

  it('marks BANK_BOOST COMPLETED when bank reaches target', async () => {
    prisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub1',
      plan: SubscriptionPlan.BANK_BOOST,
      status: SubscriptionStatus.ACTIVE,
      bankTargetRub: 1300,
      bankCurrentRub: 1180,
      bankStartRub: 1000,
      userId: 'u1',
      priceRubAtGrant: 1000,
      startsAt: new Date(),
      endsAt: null,
      completedAt: null,
      revokedAt: null,
      grantedById: null,
      createdAt: new Date(),
    });
    prisma.userSubscription.update.mockImplementation(async ({ data }) => ({
      id: 'sub1',
      plan: SubscriptionPlan.BANK_BOOST,
      status: data.status ?? SubscriptionStatus.ACTIVE,
      bankTargetRub: 1300,
      bankCurrentRub: data.bankCurrentRub,
      bankStartRub: 1000,
      userId: 'u1',
      priceRubAtGrant: 1000,
      startsAt: new Date(),
      endsAt: null,
      completedAt: data.completedAt ?? null,
      revokedAt: null,
      grantedById: null,
      createdAt: new Date(),
    }));

    const result = await service.updateBankCurrent('sub1', 1300);

    expect(prisma.userSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bankCurrentRub: 1300,
          status: SubscriptionStatus.COMPLETED,
        }),
      }),
    );
    expect(result.status).toBe(SubscriptionStatus.COMPLETED);
  });
});
