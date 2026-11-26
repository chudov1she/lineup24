import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { ACCESS_COOKIE } from '../common/cookies.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { UsersService } from '../users/users.service.js';
import type { AuthUser } from './decorators/current-user.decorator.js';

type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  sid?: string;
};

function cookieExtractor(req: Request): string | null {
  const cookies = req.cookies as Record<string, string> | undefined;
  if (!cookies) {
    return null;
  }
  return cookies[ACCESS_COOKIE] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    try {
      const user = await this.usersService.findEntityById(payload.sub);
      if (user.blockedAt) {
        throw new UnauthorizedException('Account is blocked');
      }

      if (payload.sid) {
        await this.sessionsService.assertSessionActive(
          payload.sid,
          user.id,
        );
      }

      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId: payload.sid,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException();
    }
  }
}
