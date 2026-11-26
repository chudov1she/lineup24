import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { MailModule } from '../mail/mail.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { TelegramBotService } from './telegram-bot.service.js';

@Module({
  imports: [MailModule, SubscriptionsModule, AuditModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, TelegramBotService],
  exports: [NotificationsService],
})
export class NotificationsModule {}