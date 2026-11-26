import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService.bindTelegram', () => {
  const prisma = {
    telegramLinkToken: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const config = {
    get: vi.fn((key: string, fallback = '') => {
      if (key === 'TELEGRAM_BOT_USERNAME') return 'lineup24_bot';
      return fallback;
    }),
  };

  const mailService = { sendEmailVerification: vi.fn() };
  const subscriptionsService = { hasActiveSubscription: vi.fn() };
  const auditService = { log: vi.fn() };

  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService(
      prisma as never,
      config as never,
      mailService as never,
      subscriptionsService as never,
      auditService as never,
    );
  });

  it('consumes token once', async () => {
    const token = 'bind-token-once';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    prisma.telegramLinkToken.findFirst.mockResolvedValue({
      id: 'tok1',
      tokenHash,
      chatId: '123',
      username: 'tg_user',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => {
      prisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.update.mockResolvedValue({});
      return fn(prisma);
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      telegramUsername: 'tg_user',
      telegramLinkedAt: new Date('2026-11-22T00:00:00.000Z'),
    });

    await expect(service.bindTelegram('user1', token)).resolves.toMatchObject({
      linked: true,
      telegramUsername: 'tg_user',
    });
    expect(prisma.telegramLinkToken.updateMany).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          telegramChatId: '123',
          telegramSignals: true,
        }),
      }),
    );
  });

  it('rejects already consumed / missing token', async () => {
    prisma.telegramLinkToken.findFirst.mockResolvedValue(null);
    await expect(service.bindTelegram('user1', 'gone')).rejects.toThrow(
      /Неверный или просроченный токен/,
    );
  });
});

