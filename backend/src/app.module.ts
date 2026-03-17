import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './common/health/health.module';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PartnersModule } from './modules/partners/partners.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { UnitsModule } from './modules/units/units.module';
import { LeadsModule } from './modules/leads/leads.module';
import { AttributionModule } from './modules/attribution/attribution.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { AiModule } from './modules/ai/ai.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { PremiumAssetsModule } from './modules/premium-assets/premium-assets.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { VisitsModule } from './modules/visits/visits.module';
import { BackupModule } from './modules/backup/backup.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
        // Instantiated here so ConfigService is available; lifecycle managed by ioredis
        storage: new RedisThrottlerStorage(config),
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PartnersModule,
    PromotionsModule,
    UnitsModule,
    LeadsModule,
    AttributionModule,
    CommissionsModule,
    AiModule,
    DashboardModule,
    AuditModule,
    PremiumAssetsModule,
    NotificationsModule,
    VisitsModule,
    BackupModule,
  ],
})
export class AppModule {}
