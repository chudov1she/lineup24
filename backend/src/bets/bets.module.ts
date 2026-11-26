import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { BetsWatchHub } from './bets-watch.hub.js';
import { BetsController } from './bets.controller.js';
import { BetsService } from './bets.service.js';
import { SubscriptionActiveGuard } from './subscription-active.guard.js';

@Module({
  imports: [SubscriptionsModule, NotificationsModule],
  controllers: [BetsController],
  providers: [BetsService, BetsWatchHub, SubscriptionActiveGuard],
  exports: [BetsService, BetsWatchHub],
})
export class BetsModule {}
