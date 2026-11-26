import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { Session } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export type SessionDeviceMeta = {
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  macAddress?: string;
  platform?: string;
  deviceType?: string;
};

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  createRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  async create(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    meta: SessionDeviceMeta,
  ): Promise<Session> {
    await this.enforceMaxActiveSessions(userId);

    return this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
        deviceFingerprint: meta.deviceFingerprint,
        macAddress: meta.macAddress,
        platform: meta.platform,
        deviceType: meta.deviceType,
        lastSeenAt: new Date(),
      },
    });
  }

  maxActiveSessions(): number {
    const raw = this.config.get<string | number>('MAX_ACTIVE_SESSIONS');
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
    return 5;
  }

  async enforceMaxActiveSessions(userId: string) {
    const limit = this.maxActiveSessions();
    const now = new Date();

    const active = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastSeenAt: 'asc' },
    });

    if (active.length < limit) {
      return;
    }

    const overflow = active.length - limit + 1;
    const toRevoke = active.slice(0, overflow).map((session) => session.id);
    if (toRevoke.length === 0) {
      return;
    }

    await this.prisma.session.updateMany({
      where: { id: { in: toRevoke } },
      data: { revokedAt: now },
    });
  }

  async listForUser(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      ip: session.ip,
      userAgent: session.userAgent,
      deviceFingerprint: session.deviceFingerprint,
      platform: session.platform,
      deviceType: session.deviceType,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      revokedAt: session.revokedAt,
      expiresAt: session.expiresAt,
      isActive:
        session.revokedAt === null && session.expiresAt > new Date(),
    }));
  }

  async revokeOne(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.revokedAt) {
      return { ok: true };
    }
    await this.revoke(sessionId);
    return { ok: true };
  }

  async revokeAllExceptCurrent(userId: string, currentSessionId: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async assertSessionActive(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }
    if (session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }
    return session;
  }

  async findActiveByRefreshToken(refreshToken: string): Promise<Session | null> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return session;
  }

  async rotate(
    sessionId: string,
    newRefreshToken: string,
    expiresAt: Date,
  ): Promise<Session> {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: this.hashRefreshToken(newRefreshToken),
        expiresAt,
        lastSeenAt: new Date(),
      },
    });
  }

  async touch(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
  }

  async revoke(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByRefreshToken(refreshToken: string) {
    const session = await this.findActiveByRefreshToken(refreshToken);
    if (session) {
      await this.revoke(session.id);
    }
  }
}
