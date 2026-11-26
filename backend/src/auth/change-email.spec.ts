import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

vi.mock('bcrypt', () => ({
  compare: vi.fn(async (plain: string) => plain === 'Password123!'),
  hash: vi.fn(async () => 'hashed'),
}));

describe('AuthService email change', () => {
  const usersService = {
    findEntityById: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    touchActivity: vi.fn(),
  };
  const sessionsService = {};
  const mailService = {
    sendEmailChangeCurrent: vi.fn(),
    sendEmailChangeNew: vi.fn(async () => ({
      delivered: false,
      code: '222222',
    })),
  };
  const jwtService = {};
  const prisma = {
    emailChangeRequest: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: { update: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  };
  const config = {
    get: vi.fn((key: string, fallback?: string) => {
      if (key === 'NODE_ENV') return 'test';
      return fallback;
    }),
  };
  const audit = { log: vi.fn() };
  const subscriptions = { getMe: vi.fn() };

  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      usersService as never,
      sessionsService as never,
      mailService as never,
      jwtService as never,
      prisma as never,
      config as never,
      audit as never,
      subscriptions as never,
    );
    usersService.findEntityById.mockResolvedValue({
      id: 'u1',
      email: 'old@ex.com',
      passwordHash: 'hashed',
    });
    usersService.findByEmail.mockResolvedValue(null);
  });

  it('startEmailChange rejects wrong password', async () => {
    await expect(
      service.startEmailChange('u1', 'new@ex.com', 'wrong'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('startEmailChange rejects same email', async () => {
    await expect(
      service.startEmailChange('u1', 'old@ex.com', 'Password123!'),
    ).rejects.toThrow(/совпадает/);
  });

  it('start sends code to new email only, then verify updates email', async () => {
    prisma.emailChangeRequest.create.mockResolvedValue({});
    prisma.emailChangeRequest.updateMany.mockResolvedValue({ count: 0 });

    const started = await service.startEmailChange(
      'u1',
      'new@ex.com',
      'Password123!',
    );
    expect(started.step).toBe('verify-new');
    expect(mailService.sendEmailChangeNew).toHaveBeenCalledWith(
      'new@ex.com',
      expect.any(String),
    );
    expect(mailService.sendEmailChangeCurrent).not.toHaveBeenCalled();
    expect(prisma.emailChangeRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          newEmail: 'new@ex.com',
          oldVerifiedAt: expect.any(Date),
          newCode: expect.any(String),
        }),
      }),
    );

    prisma.emailChangeRequest.findFirst.mockResolvedValueOnce({
      id: 'req1',
      userId: 'u1',
      newEmail: 'new@ex.com',
      oldCode: 'skipped',
      newCode: '222222',
      oldVerifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    usersService.touchActivity.mockResolvedValue(undefined);
    usersService.findById.mockResolvedValue({
      id: 'u1',
      email: 'new@ex.com',
      telegramLinkedAt: null,
      telegramUsername: null,
      tosVersion: '2026-11-22',
      privacyVersion: '2026-11-22',
    });
    subscriptions.getMe.mockResolvedValue({
      hasActiveSubscription: false,
      activePlans: [],
    });
    prisma.emailChangeRequest.findFirst.mockResolvedValueOnce(null);

    const done = await service.verifyEmailChangeNew('u1', '222222');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(done.email).toBe('new@ex.com');
    expect(done.emailChangePending).toBeNull();
  });

  it('cancelEmailChange consumes pending requests', async () => {
    prisma.emailChangeRequest.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.cancelEmailChange('u1')).resolves.toEqual({ ok: true });
    expect(prisma.emailChangeRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', consumedAt: null },
      }),
    );
  });
});
