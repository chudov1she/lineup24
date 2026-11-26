import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@prisma/client';

export type AuthUser = {
  userId: string;
  email: string;
  role: Role;
  sessionId?: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
