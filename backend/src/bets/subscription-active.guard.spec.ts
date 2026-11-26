import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SubscriptionActiveGuard } from './subscription-active.guard.js';

function makeContext(user?: { userId: string; role: Role }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  };
}

describe('SubscriptionActiveGuard', () => {
  it('allows ADMIN without subscription check', async () => {
    const subscriptionsService = {
      hasActiveSubscription: vi.fn(),
    };
    const guard = new SubscriptionActiveGuard(subscriptionsService as never);
    await expect(
      guard.canActivate(
        makeContext({ userId: 'admin', role: Role.ADMIN }) as never,
      ),
    ).resolves.toBe(true);
    expect(subscriptionsService.hasActiveSubscription).not.toHaveBeenCalled();
  });

  it('forbids USER without active subscription', async () => {
    const subscriptionsService = {
      hasActiveSubscription: vi.fn().mockResolvedValue(false),
    };
    const guard = new SubscriptionActiveGuard(subscriptionsService as never);
    await expect(
      guard.canActivate(
        makeContext({ userId: 'user', role: Role.USER }) as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows USER with active subscription', async () => {
    const subscriptionsService = {
      hasActiveSubscription: vi.fn().mockResolvedValue(true),
    };
    const guard = new SubscriptionActiveGuard(subscriptionsService as never);
    await expect(
      guard.canActivate(
        makeContext({ userId: 'user', role: Role.USER }) as never,
      ),
    ).resolves.toBe(true);
  });
});
