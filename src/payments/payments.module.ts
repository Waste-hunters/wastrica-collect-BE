import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MtnMomoClient } from './momo/mtn-momo.client';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhookGuard } from './webhook.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, WebhookGuard, MtnMomoClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
