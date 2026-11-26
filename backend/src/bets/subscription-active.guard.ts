import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    const hasActive = await this.subscriptionsService.hasActiveSubscription(
      user.userId,
    );
    if (!hasActive) {
      throw new ForbiddenException('Active subscription required');
    }

    return true;
  }
}
