import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService telegram bind', () => {
  const prisma = {
    telegramLinkToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const config = {
    get: vi.fn((key: string, fallback = '') => {
      if (key === 'TELEGRAM_BOT_USERNAME') return 'lineup24_bot';
      if (key === 'FRONTEND_URL') return 'https://lineup24.ru';
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

  it('creates deep link for user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      telegramLinkedAt: null,
      telegramChatId: null,
    });
    prisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 0 });
    prisma.telegramLinkToken.create.mockResolvedValue({});

    const result = await service.createTelegramDeepLink('user1');
    expect(result.alreadyLinked).toBe(false);
    expect(result.deepLink).toMatch(
      /^https:\/\/t\.me\/lineup24_bot\?start=[A-Za-z0-9_-]+$/,
    );
    expect(prisma.telegramLinkToken.create).toHaveBeenCalled();
  });

  it('consumes paste token once', async () => {
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
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => {
        prisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
        prisma.user.updateMany.mockResolvedValue({ count: 0 });
        prisma.user.update.mockResolvedValue({});
        return fn(prisma);
      },
    );
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
      BadRequestException,
    );
  });

  it('binds via /start payload', async () => {
    const token = 'deeplink-token-abc';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    prisma.telegramLinkToken.findFirst.mockResolvedValue({
      id: 'tok2',
      tokenHash,
      userId: 'user1',
      chatId: null,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => {
        prisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
        prisma.user.updateMany.mockResolvedValue({ count: 0 });
        prisma.user.update.mockResolvedValue({});
        return fn(prisma);
      },
    );

    await expect(
      service.handleTelegramWebhook({
        update_id: 1,
        message: {
          text: `/start ${token}`,
          chat: { id: 2064202147 },
          from: { username: 'chudov1she0' },
        },
      }),
    ).resolves.toEqual({ ok: true });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user1' },
        data: expect.objectContaining({
          telegramChatId: '2064202147',
          telegramUsername: 'chudov1she0',
          telegramSignals: true,
        }),
      }),
    );
  });
});
