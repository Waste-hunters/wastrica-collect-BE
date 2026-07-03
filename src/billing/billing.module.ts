import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MomoModule } from '../momo/momo.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingSchedulerService } from './billing-scheduler.service';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [PrismaModule, AuthModule, MomoModule],
  controllers: [BillingController],
  providers: [BillingService, BillingSchedulerService],
  exports: [BillingService],
})
export class BillingModule {}
