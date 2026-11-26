import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

function utcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  createVisitorKey(): string {
    return randomBytes(16).toString('hex');
  }

  async recordPageview(visitorKey: string, path: string): Promise<{ ok: true }> {
    const day = utcDay();
    await this.prisma.siteVisit.upsert({
      where: {
        visitorKey_path_day: { visitorKey, path, day },
      },
      create: { visitorKey, path, day },
      update: {},
    });
    return { ok: true };
  }

  async countUniques(path: string, from: Date, to: Date): Promise<number> {
    return this.prisma.siteVisit.count({
      where: {
        path,
        day: { gte: from, lte: to },
      },
    });
  }

  async countUniquesToday(path: string): Promise<number> {
    const day = utcDay();
    return this.prisma.siteVisit.count({
      where: { path, day },
    });
  }
}
