import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { PaymentOrderStatus, SubscriptionPlan } from '@prisma/client';
import { PaymentsService } from './payments.service.js';

describe('PaymentsService.handlePlategaWebhook', () => {
  const prisma = {
    paymentOrder: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userSubscription: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const config = {
    get: vi.fn((key: string, fallback = '') => {
      if (key === 'PLATEGA_MERCHANT_ID') return 'merchant-1';
      if (key === 'PLATEGA_SECRET') return 'secret-1';
      if (key === 'PLATEGA_API_BASE') return 'https://app.platega.io';
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      return fallback;
    }),
  };

  const subscriptionsService = {
    grant: vi.fn(),
    revoke: vi.fn(),
    toPublic: vi.fn((sub: unknown) => sub),
  };

  const usersService = {
    findEntityById: vi.fn(),
  };

  let service: PaymentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentsService(
      prisma as never,
      config as never,
      subscriptionsService as never,
      usersService as never,
    );
  });

  it('rejects invalid webhook credentials', async () => {
    await expect(
      service.handlePlategaWebhook('bad', 'secret-1', {
        status: 'CONFIRMED',
        id: 'tx-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('is idempotent when order already paid', async () => {
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'ord_1',
      status: PaymentOrderStatus.PAID,
      paidAt: new Date(),
      userId: 'u1',
      plan: SubscriptionPlan.MONTHLY,
    });

    const result = await service.handlePlategaWebhook(
      'merchant-1',
      'secret-1',
      {
        id: 'tx-1',
        status: 'CONFIRMED',
        amount: 7777,
        currency: 'RUB',
        paymentMethod: 2,
        payload: 'ord_1',
      },
    );

    expect(result).toMatchObject({ ok: true, idempotent: true });
    expect(subscriptionsService.grant).not.toHaveBeenCalled();
  });

  it('marks canceled without granting', async () => {
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'ord_2',
      status: PaymentOrderStatus.PENDING,
      userId: 'u1',
      plan: SubscriptionPlan.BANK_BOOST,
      failedAt: null,
    });
    prisma.paymentOrder.update.mockResolvedValue({});

    const result = await service.handlePlategaWebhook(
      'merchant-1',
      'secret-1',
      {
        id: 'tx-2',
        status: 'CANCELED',
        amount: 1000,
        currency: 'RUB',
        paymentMethod: 2,
        payload: 'ord_2',
      },
    );

    expect(result).toEqual({ ok: true });
    expect(prisma.paymentOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentOrderStatus.CANCELLED,
        }),
      }),
    );
    expect(subscriptionsService.grant).not.toHaveBeenCalled();
  });

  it('revokes active subscription on chargeback', async () => {
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'ord_3',
      status: PaymentOrderStatus.PAID,
      userId: 'u1',
      plan: SubscriptionPlan.MONTHLY,
    });
    prisma.paymentOrder.update.mockResolvedValue({});
    prisma.userSubscription.findFirst.mockResolvedValue({
      id: 'sub_3',
      status: 'ACTIVE',
    });
    subscriptionsService.revoke.mockResolvedValue({});

    const result = await service.handlePlategaWebhook(
      'merchant-1',
      'secret-1',
      {
        id: 'tx-3',
        status: 'CHARGEBACKED',
        amount: 7777,
        currency: 'RUB',
        paymentMethod: 2,
        payload: 'ord_3',
      },
    );

    expect(result).toEqual({ ok: true });
    expect(subscriptionsService.revoke).toHaveBeenCalledWith('sub_3');
  });
});
