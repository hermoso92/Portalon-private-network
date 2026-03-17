import { Module, forwardRef } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { AiModule } from '../ai/ai.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { PartnersModule } from '../partners/partners.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AiModule, forwardRef(() => CommissionsModule), PartnersModule, AuditModule, NotificationsModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
