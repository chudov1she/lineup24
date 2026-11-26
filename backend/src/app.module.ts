import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BetsModule } from './bets/bets.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Single global bucket. Named `auth` used to apply to EVERY route (20/min) and
    // choked watch/polling — auth routes override via @Throttle({ default: … }).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => [
        {
          name: 'default',
          ttl: 60_000,
          limit: 300,
        },
      ],
    }),
    PrismaModule,
    AuditModule,
    AnalyticsModule,
    UsersModule,
    SessionsModule,
    AuthModule,
    SubscriptionsModule,
    BetsModule,
    PaymentsModule,
    NotificationsModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
