import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BetResult } from '@prisma/client';
import { BetsService } from './bets.service.js';

describe('BetsService.listArchive', () => {
  const prisma = {
    bet: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
  const notificationsService = { sendSignalTeaser: vi.fn() };
  const watchHub = { publish: vi.fn(), waitForEvent: vi.fn() };
  const subscriptionsService = { syncBanksAfterBetMutation: vi.fn() };
  let service: BetsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BetsService(
      prisma as never,
      notificationsService as never,
      watchHub as never,
      subscriptionsService as never,
    );
  });

  it('returns only settled bets without comments', async () => {
    prisma.bet.findMany.mockResolvedValue([
      {
        id: '1',
        title: 'A — B',
        forecast: 'ТБ 2.5',
        odds: 1.9,
        score: '3:1',
        result: BetResult.WON,
        publishedAt: new Date('2026-11-01'),
      },
    ]);
    prisma.bet.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(4);

    const result = await service.listArchive({ page: 1, limit: 40 });

    expect(prisma.bet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { result: { in: [BetResult.WON, BetResult.LOST] } },
      }),
    );
    expect(result.items[0]).toMatchObject({
      id: '1',
      title: 'A — B',
      result: BetResult.WON,
    });
    expect(result.items[0]).not.toHaveProperty('comment');
    expect(result.hitRate).toBe(60);
  });
});
