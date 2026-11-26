import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
  type User,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from '../auth/dto/register.dto.js';
import type { ListUsersQueryDto } from './dto/list-users-query.dto.js';

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  blockedAt: Date | null;
  tosAcceptedAt: Date | null;
  tosVersion: string | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
  emailSignals: boolean;
  telegramSignals: boolean;
  browserPushSignals: boolean;
  telegramUsername: string | null;
  telegramLinkedAt: Date | null;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminUserListItem = PublicUser & {
  activePlans: SubscriptionPlan[];
};

function activeSubscriptionWhere(
  now: Date,
  plan?: SubscriptionPlan,
): Prisma.UserSubscriptionWhereInput {
  return {
    status: SubscriptionStatus.ACTIVE,
    revokedAt: null,
    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    ...(plan ? { plan } : {}),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerifiedAt: user.emailVerifiedAt,
      blockedAt: user.blockedAt,
      tosAcceptedAt: user.tosAcceptedAt,
      tosVersion: user.tosVersion,
      privacyAcceptedAt: user.privacyAcceptedAt,
      privacyVersion: user.privacyVersion,
      emailSignals: user.emailSignals,
      telegramSignals: user.telegramSignals,
      browserPushSignals: user.browserPushSignals,
      telegramUsername: user.telegramUsername,
      telegramLinkedAt: user.telegramLinkedAt,
      lastActivityAt: user.lastActivityAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async create(dto: RegisterDto, role: Role = Role.USER): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase() }, { username: dto.username }],
      },
    });
    if (existing) {
      if (existing.email === dto.email.toLowerCase()) {
        throw new ConflictException(
          'Этот email уже зарегистрирован. Войдите или восстановите пароль.',
        );
      }
      throw new ConflictException(
        'Это имя пользователя уже занято. Выберите другое.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const tosVersion = process.env.TOS_VERSION ?? '2026-11-22';
    const privacyVersion = process.env.PRIVACY_VERSION ?? '2026-11-22';
    const now = new Date();
    return this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email.toLowerCase(),
        passwordHash,
        role,
        lastActivityAt: now,
        tosAcceptedAt: now,
        tosVersion,
        privacyAcceptedAt: now,
        privacyVersion,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublic(user);
  }

  async findEntityById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async touchActivity(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActivityAt: new Date() },
    });
  }

  async updateUsername(userId: string, username: string): Promise<PublicUser> {
    const normalized = username.trim();
    const current = await this.findEntityById(userId);
    if (current.username === normalized) {
      return this.toPublic(current);
    }

    const taken = await this.prisma.user.findFirst({
      where: {
        username: normalized,
        NOT: { id: userId },
      },
    });
    if (taken) {
      throw new ConflictException(
        'Это имя пользователя уже занято. Выберите другое.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { username: normalized },
    });
    return this.toPublic(updated);
  }

  async markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async listAdmin(query: ListUsersQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const q = query.q?.trim();
    const now = new Date();
    const activeSubFilter = activeSubscriptionWhere(now, query.plan);

    const where: Prisma.UserWhereInput = {};

    if (q) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (query.role) {
      where.role = query.role;
    }
    if (query.blocked === true) {
      where.blockedAt = { not: null };
    } else if (query.blocked === false) {
      where.blockedAt = null;
    }
    if (query.hasActiveSubscription === true || query.plan) {
      where.subscriptions = { some: activeSubFilter };
    } else if (query.hasActiveSubscription === false) {
      where.subscriptions = { none: activeSubscriptionWhere(now) };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: {
            where: activeSubscriptionWhere(now),
            select: { plan: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      total,
      skip,
      take,
      items: items.map((user) => {
        const { subscriptions, ...rest } = user;
        return {
          ...this.toPublic(rest),
          activePlans: [
            ...new Set(subscriptions.map((subscription) => subscription.plan)),
          ],
        } satisfies AdminUserListItem;
      }),
    };
  }

  async getAdminDetail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });

    const subscriptions = await this.prisma.userSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const fingerprints = [
      ...new Set(
        sessions
          .map((item) => item.deviceFingerprint)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const fingerprintOverlaps =
      fingerprints.length === 0
        ? []
        : await this.prisma.session.findMany({
            where: {
              userId: { not: userId },
              deviceFingerprint: { in: fingerprints },
              revokedAt: null,
            },
            include: {
              user: {
                select: { id: true, username: true, email: true },
              },
            },
            orderBy: { lastSeenAt: 'desc' },
            take: 100,
          });

    return {
      user: this.toPublic(user),
      subscriptions,
      sessions: sessions.map((session) => ({
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
      })),
      fingerprintOverlaps: fingerprintOverlaps.map((session) => ({
        sessionId: session.id,
        user: session.user,
        deviceFingerprint: session.deviceFingerprint,
        lastSeenAt: session.lastSeenAt,
      })),
    };
  }

  async updateAdmin(
    userId: string,
    dto: {
      role?: Role;
      blockedAt?: 'now' | null;
      username?: string;
      email?: string;
      password?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: {
      role?: Role;
      blockedAt?: Date | null;
      username?: string;
      email?: string;
      passwordHash?: string;
      emailVerifiedAt?: Date;
    } = {};

    if (dto.role !== undefined) {
      data.role = dto.role;
    }
    if (dto.blockedAt === 'now') {
      data.blockedAt = new Date();
    } else if (dto.blockedAt === null) {
      data.blockedAt = null;
    }

    if (dto.username !== undefined) {
      const username = dto.username.trim();
      if (username !== user.username) {
        const taken = await this.prisma.user.findFirst({
          where: { username, NOT: { id: userId } },
        });
        if (taken) {
          throw new ConflictException(
            'Это имя пользователя уже занято. Выберите другое.',
          );
        }
        data.username = username;
      }
    }

    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase().trim();
      if (email !== user.email) {
        const taken = await this.prisma.user.findFirst({
          where: { email, NOT: { id: userId } },
        });
        if (taken) {
          throw new ConflictException('Этот email уже используется');
        }
        data.email = email;
        // Admin override — treat as verified immediately.
        data.emailVerifiedAt = new Date();
      }
    }

    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    if (Object.keys(data).length === 0) {
      return this.toPublic(user);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.toPublic(updated);
  }
}
