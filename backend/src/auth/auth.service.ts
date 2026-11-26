import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import type { Response } from 'express';
import { AuditService } from '../audit/audit.service.js';
import {
  clearAuthCookies,
  setAuthCookies,
} from '../common/cookies.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  SessionsService,
  type SessionDeviceMeta,
} from '../sessions/sessions.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { UsersService, type PublicUser } from '../users/users.service.js';
import { AcceptLegalDto } from './dto/accept-legal.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

type AuthSuccess = {
  user: PublicUser;
  verificationCode?: string;
};

export type EmailChangePending = {
  newEmail: string;
  step: 'verify-new';
  expiresAt: Date;
};

export type MeResponse = PublicUser & {
  hasActiveSubscription: boolean;
  activePlans: string[];
  tosCurrentVersion: string;
  privacyCurrentVersion: string;
  needsTosReaccept: boolean;
  telegramLinked: boolean;
  emailChangePending: EmailChangePending | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async register(
    dto: RegisterDto,
    res: Response,
    meta: SessionDeviceMeta,
  ): Promise<AuthSuccess> {
    if (!dto.tosAccepted || !dto.privacyAccepted) {
      throw new BadRequestException('Примите пользовательское соглашение и политику конфиденциальности');
    }
    const tosVersion = this.config.get<string>('TOS_VERSION', '2026-11-22');
    const privacyVersion = this.config.get<string>(
      'PRIVACY_VERSION',
      '2026-11-22',
    );
    const user = await this.usersService.create(dto, Role.USER);
    await this.prisma.legalAcceptance.createMany({
      data: [
        {
          userId: user.id,
          documentKey: 'tos',
          version: tosVersion,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
        {
          userId: user.id,
          documentKey: 'privacy',
          version: privacyVersion,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      ],
    });
    await this.audit.log({
      actorId: user.id,
      action: 'auth.register',
      entity: 'User',
      entityId: user.id,
      ip: meta.ip,
    });
    await this.issueSessionCookies(user.id, user.email, user.role, res, meta);
    const verificationCode = await this.createAndSendVerification(
      user.id,
      user.email,
    );
    return {
      user: this.usersService.toPublic(user),
      ...(verificationCode ? { verificationCode } : {}),
    };
  }

  async login(
    dto: LoginDto,
    res: Response,
    meta: SessionDeviceMeta,
  ): Promise<AuthSuccess> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(
        'Неверный email или пароль. Проверьте данные или восстановите пароль.',
      );
    }
    if (user.blockedAt) {
      throw new UnauthorizedException(
        'Аккаунт заблокирован. Напишите в поддержку: support@lineup24.ru',
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Неверный email или пароль. Проверьте данные или восстановите пароль.',
      );
    }

    await this.usersService.touchActivity(user.id);
    await this.issueSessionCookies(user.id, user.email, user.role, res, meta);
    await this.audit.log({
      actorId: user.id,
      action: 'auth.login',
      entity: 'User',
      entityId: user.id,
      ip: meta.ip,
    });
    return { user: this.usersService.toPublic(user) };
  }

  async refresh(
    refreshToken: string | undefined,
    res: Response,
  ): Promise<{ ok: true }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Сессия не найдена. Войдите снова.');
    }

    const session =
      await this.sessionsService.findActiveByRefreshToken(refreshToken);
    if (!session) {
      clearAuthCookies(res, this.isProd());
      throw new UnauthorizedException(
        'Сессия устарела или недействительна. Войдите снова.',
      );
    }

    const user = await this.usersService.findEntityById(session.userId);
    if (user.blockedAt) {
      clearAuthCookies(res, this.isProd());
      throw new UnauthorizedException('Аккаунт заблокирован. Напишите в поддержку: support@lineup24.ru');
    }

    const newRefresh = this.sessionsService.createRefreshToken();
    const refreshExpiresAt = this.refreshExpiresAt();
    await this.sessionsService.rotate(session.id, newRefresh, refreshExpiresAt);
    await this.usersService.touchActivity(user.id);

    const accessToken = await this.signAccessToken(
      user.id,
      user.email,
      user.role,
      session.id,
    );
    setAuthCookies(
      res,
      { accessToken, refreshToken: newRefresh },
      this.cookieMaxAges(),
      this.isProd(),
    );
    return { ok: true };
  }

  async logout(refreshToken: string | undefined, res: Response) {
    if (refreshToken) {
      await this.sessionsService.revokeByRefreshToken(refreshToken);
    }
    clearAuthCookies(res, this.isProd());
    return { ok: true };
  }

  async me(userId: string): Promise<MeResponse> {
    await this.usersService.touchActivity(userId);
    const user = await this.usersService.findById(userId);
    const sub = await this.subscriptions.getMe(userId);
    const tosCurrentVersion = this.config.get<string>(
      'TOS_VERSION',
      '2026-11-22',
    );
    const privacyCurrentVersion = this.config.get<string>(
      'PRIVACY_VERSION',
      '2026-11-22',
    );
    return {
      ...user,
      hasActiveSubscription: sub.hasActiveSubscription,
      activePlans: sub.activePlans,
      tosCurrentVersion,
      privacyCurrentVersion,
      needsTosReaccept:
        user.tosVersion !== tosCurrentVersion ||
        user.privacyVersion !== privacyCurrentVersion,
      // Username is optional in Telegram; chat link is enough.
      telegramLinked: Boolean(user.telegramLinkedAt),
      emailChangePending: await this.getEmailChangePending(userId),
    };
  }

  private async getEmailChangePending(
    userId: string,
  ): Promise<EmailChangePending | null> {
    const req = await this.prisma.emailChangeRequest.findFirst({
      where: {
        userId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!req) return null;
    return {
      newEmail: req.newEmail,
      step: 'verify-new',
      expiresAt: req.expiresAt,
    };
  }

  async acceptLegal(
    userId: string,
    dto: AcceptLegalDto,
    meta: SessionDeviceMeta,
  ): Promise<MeResponse> {
    if (!dto.tosAccepted || !dto.privacyAccepted) {
      throw new BadRequestException('Примите пользовательское соглашение и политику конфиденциальности');
    }
    const tosVersion = this.config.get<string>('TOS_VERSION', '2026-11-22');
    const privacyVersion = this.config.get<string>(
      'PRIVACY_VERSION',
      '2026-11-22',
    );
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          tosAcceptedAt: now,
          tosVersion,
          privacyAcceptedAt: now,
          privacyVersion,
        },
      }),
      this.prisma.legalAcceptance.create({
        data: {
          userId,
          documentKey: 'tos',
          version: tosVersion,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
      this.prisma.legalAcceptance.create({
        data: {
          userId,
          documentKey: 'privacy',
          version: privacyVersion,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    ]);
    await this.audit.log({
      actorId: userId,
      action: 'auth.accept_legal',
      entity: 'User',
      entityId: userId,
      ip: meta.ip,
      meta: { tosVersion, privacyVersion },
    });
    return this.me(userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findEntityById(userId);
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Текущий пароль указан неверно');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.audit.log({
      actorId: userId,
      action: 'auth.change_password',
      entity: 'User',
      entityId: userId,
    });
    return { ok: true };
  }

  async changeUsername(userId: string, username: string) {
    const user = await this.usersService.updateUsername(userId, username);
    await this.audit.log({
      actorId: userId,
      action: 'auth.change_username',
      entity: 'User',
      entityId: userId,
      meta: { username: user.username },
    });
    return this.me(userId);
  }

  async startEmailChange(
    userId: string,
    newEmail: string,
    currentPassword: string,
  ) {
    const normalized = newEmail.toLowerCase().trim();
    const user = await this.usersService.findEntityById(userId);
    const passwordOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordOk) {
      throw new BadRequestException('Текущий пароль указан неверно');
    }
    if (normalized === user.email) {
      throw new BadRequestException('Новый email совпадает с текущим');
    }
    const taken = await this.usersService.findByEmail(normalized);
    if (taken) {
      throw new BadRequestException('Этот email уже используется');
    }
    const newCode = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.emailChangeRequest.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    // Single-step flow: code goes only to the new address (password proves access).
    await this.prisma.emailChangeRequest.create({
      data: {
        userId,
        newEmail: normalized,
        oldCode: 'skipped',
        newCode,
        oldVerifiedAt: new Date(),
        expiresAt,
      },
    });
    const mailed = await this.mailService.sendEmailChangeNew(
      normalized,
      newCode,
    );
    await this.audit.log({
      actorId: userId,
      action: 'auth.change_email_start',
      entity: 'User',
      entityId: userId,
      meta: { newEmail: normalized },
    });
    return {
      ok: true,
      step: 'verify-new' as const,
      newEmail: normalized,
      expiresAt,
      ...(mailed.code || !this.isProd()
        ? { newCode: mailed.code ?? newCode }
        : {}),
    };
  }

  async verifyEmailChangeNew(userId: string, code: string) {
    const req = await this.prisma.emailChangeRequest.findFirst({
      where: {
        userId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        oldVerifiedAt: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!req || req.newCode !== code) {
      throw new BadRequestException('Неверный или просроченный код');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { email: req.newEmail, emailVerifiedAt: new Date() },
      }),
      this.prisma.emailChangeRequest.update({
        where: { id: req.id },
        data: { consumedAt: new Date() },
      }),
    ]);
    await this.audit.log({
      actorId: userId,
      action: 'auth.change_email',
      entity: 'User',
      entityId: userId,
      meta: { newEmail: req.newEmail },
    });
    return this.me(userId);
  }

  async resendEmailChangeCode(userId: string) {
    const req = await this.prisma.emailChangeRequest.findFirst({
      where: {
        userId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!req) {
      throw new BadRequestException('Нет активной заявки на смену email');
    }

    const newCode = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.emailChangeRequest.update({
      where: { id: req.id },
      data: {
        newCode,
        oldVerifiedAt: req.oldVerifiedAt ?? new Date(),
        expiresAt,
      },
    });
    const mailed = await this.mailService.sendEmailChangeNew(
      req.newEmail,
      newCode,
    );
    return {
      ok: true,
      step: 'verify-new' as const,
      newEmail: req.newEmail,
      expiresAt,
      ...(mailed.code || !this.isProd()
        ? { newCode: mailed.code ?? newCode }
        : {}),
    };
  }

  async cancelEmailChange(userId: string) {
    await this.prisma.emailChangeRequest.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.audit.log({
      actorId: userId,
      action: 'auth.change_email_cancel',
      entity: 'User',
      entityId: userId,
    });
    return { ok: true as const };
  }

  async verifyEmail(userId: string, code: string): Promise<PublicUser> {
    const record = await this.prisma.emailVerification.findFirst({
      where: {
        userId,
        code,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw new BadRequestException('Неверный или просроченный код подтверждения');
    }

    await this.prisma.emailVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    const user = await this.usersService.markEmailVerified(userId);
    return this.usersService.toPublic(user);
  }

  async resendVerification(userId: string): Promise<AuthSuccess> {
    const user = await this.usersService.findEntityById(userId);
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email уже подтверждён');
    }
    const verificationCode = await this.createAndSendVerification(
      user.id,
      user.email,
    );
    return {
      user: this.usersService.toPublic(user),
      ...(verificationCode ? { verificationCode } : {}),
    };
  }

  async forgotPassword(email: string) {
    const normalized = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalized);
    if (!user || user.blockedAt) {
      return { ok: true as const, sent: false as const };
    }

    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.passwordReset.create({
      data: { userId: user.id, code, expiresAt },
    });
    const result = await this.mailService.sendPasswordReset(user.email, code);
    await this.audit.log({
      actorId: user.id,
      action: 'auth.forgot_password',
      entity: 'User',
      entityId: user.id,
    });
    return {
      ok: true as const,
      sent: true as const,
      ...(result.code ? { code: result.code } : {}),
    };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const normalized = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalized);
    if (!user || user.blockedAt) {
      throw new BadRequestException('Неверный или просроченный код сброса пароля');
    }

    const record = await this.prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        code,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw new BadRequestException('Неверный или просроченный код сброса пароля');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.passwordReset.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
    ]);
    await this.sessionsService.revokeAllForUser(user.id);
    await this.audit.log({
      actorId: user.id,
      action: 'auth.reset_password',
      entity: 'User',
      entityId: user.id,
    });
    return { ok: true as const };
  }

  private async createAndSendVerification(
    userId: string,
    email: string,
  ): Promise<string | undefined> {
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.emailVerification.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.emailVerification.create({
      data: { userId, code, expiresAt },
    });

    const result = await this.mailService.sendEmailVerification(email, code);
    return result.code;
  }

  private async issueSessionCookies(
    userId: string,
    email: string,
    role: Role,
    res: Response,
    meta: SessionDeviceMeta,
  ) {
    const refreshToken = this.sessionsService.createRefreshToken();
    const session = await this.sessionsService.create(
      userId,
      refreshToken,
      this.refreshExpiresAt(),
      meta,
    );
    const accessToken = await this.signAccessToken(
      userId,
      email,
      role,
      session.id,
    );
    setAuthCookies(
      res,
      { accessToken, refreshToken },
      this.cookieMaxAges(),
      this.isProd(),
    );
  }

  private signAccessToken(
    userId: string,
    email: string,
    role: Role,
    sessionId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, email, role, sid: sessionId },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m') as `${number}m`,
      },
    );
  }

  private refreshExpiresAt(): Date {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES', '30d');
    return new Date(Date.now() + this.parseDurationMs(raw));
  }

  private cookieMaxAges() {
    return {
      accessMs: this.parseDurationMs(
        this.config.get<string>('JWT_ACCESS_EXPIRES', '15m'),
      ),
      refreshMs: this.parseDurationMs(
        this.config.get<string>('JWT_REFRESH_EXPIRES', '30d'),
      ),
    };
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) {
      return 15 * 60 * 1000;
    }
    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return amount * (multipliers[unit] ?? 60 * 1000);
  }

  private isProd(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
