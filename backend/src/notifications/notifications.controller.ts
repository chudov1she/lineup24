import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateBroadcastDto } from './dto/create-broadcast.dto.js';
import { ListBroadcastsQueryDto } from './dto/list-broadcasts-query.dto.js';
import {
  PushSubscribeDto,
  PushUnsubscribeDto,
} from './dto/push-subscribe.dto.js';
import { TelegramBindDto } from './dto/telegram-bind.dto.js';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto.js';
import { UserEmailDto } from './dto/user-email.dto.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @SkipThrottle()
  @Post('telegram/webhook')
  telegramWebhook(
    @Query('secret') querySecret: string | undefined,
    @Headers('x-telegram-webhook-secret') headerSecret: string | undefined,
    @Headers('x-telegram-bot-api-secret-token') botSecret: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    this.notificationsService.assertTelegramWebhookSecret(
      querySecret,
      headerSecret ?? botSecret,
    );
    return this.notificationsService.handleTelegramWebhook(
      body as Parameters<NotificationsService['handleTelegramWebhook']>[0],
    );
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('telegram/bind')
  bindTelegram(@CurrentUser() user: AuthUser, @Body() dto: TelegramBindDto) {
    return this.notificationsService.bindTelegram(user.userId, dto.token);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('telegram/unbind')
  unbindTelegram(@CurrentUser() user: AuthUser) {
    return this.notificationsService.unbindTelegram(user.userId);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('prefs')
  updatePrefs(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNotificationPrefsDto,
  ) {
    return this.notificationsService.updatePrefs(user.userId, dto);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Get('push/vapid-public-key')
  vapidPublicKey() {
    return this.notificationsService.getVapidPublicKey();
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('push/subscribe')
  subscribePush(
    @CurrentUser() user: AuthUser,
    @Body() dto: PushSubscribeDto,
  ) {
    return this.notificationsService.subscribePush(user.userId, dto);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('push/subscribe')
  unsubscribePush(
    @CurrentUser() user: AuthUser,
    @Body() dto: PushUnsubscribeDto,
  ) {
    return this.notificationsService.unsubscribePush(
      user.userId,
      dto.endpoint,
    );
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('broadcasts')
  createBroadcast(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateBroadcastDto,
  ) {
    return this.notificationsService.createBroadcast(admin.userId, dto);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('broadcasts')
  listBroadcasts(@Query() query: ListBroadcastsQueryDto) {
    return this.notificationsService.listBroadcasts(query);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('users/:userId/email')
  emailUser(
    @CurrentUser() admin: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UserEmailDto,
  ) {
    return this.notificationsService.emailUser(admin.userId, userId, dto);
  }
}