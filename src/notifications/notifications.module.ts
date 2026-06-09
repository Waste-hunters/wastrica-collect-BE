import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Module({
  providers: [SmsService, EmailService],
  exports: [SmsService, EmailService],
})
export class NotificationsModule {}
