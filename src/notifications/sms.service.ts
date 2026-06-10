// SMS sending is temporarily disabled in favour of email OTP during development.
// Twilio Verify credentials are paid — re-enable this service when ready for production SMS.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {
    this.logger.warn(
      'SmsService: SMS sending is disabled. OTPs are delivered via email.',
    );
  }

  // async sendVerification(phoneNumber: string) {
  //   return await this.client!.verify.v2
  //     .services(this.verifyServiceSid)
  //     .verifications.create({ to: phoneNumber, channel: 'sms' });
  // }

  // async checkVerification(phoneNumber: string, code: string): Promise<boolean> {
  //   const result = await this.client!.verify.v2
  //     .services(this.verifyServiceSid)
  //     .verificationChecks.create({ to: phoneNumber, code });
  //   return result.status === 'approved';
  // }
}
