import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsService } from './metrics.service.js';

@Module({
  imports: [SubscriptionsModule, AnalyticsModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
