import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly client: Twilio.Twilio | null = null;
  private readonly verifyServiceSid: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.verifyServiceSid =
      this.configService.get<string>('TWILIO_VERIFY_SERVICE_SID') ?? '';

    if (accountSid && authToken && this.verifyServiceSid) {
      this.client = Twilio(accountSid, authToken);
    }
  }

  async sendVerification(phoneNumber: string) {
    this.assertConfigured();

    try {
      return await this.client!.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({ to: phoneNumber, channel: 'sms' });
    } catch (error) {
      throw new BadGatewayException({
        message: 'Failed to send OTP via Twilio Verify',
        providerError: this.formatProviderError(error),
      });
    }
  }

  async checkVerification(phoneNumber: string, code: string): Promise<boolean> {
    this.assertConfigured();

    try {
      const result = await this.client!.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({ to: phoneNumber, code });

      return result.status === 'approved';
    } catch (error) {
      throw new BadGatewayException({
        message: 'Failed to verify OTP via Twilio Verify',
        providerError: this.formatProviderError(error),
      });
    }
  }

  private assertConfigured() {
    if (!this.client) {
      throw new InternalServerErrorException(
        'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.',
      );
    }
  }

  private formatProviderError(error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (
        error as { response?: { data?: unknown; status?: number } }
      ).response;

      return { status: response?.status, data: response?.data };
    }

    if (error instanceof Error) return error.message;

    return error;
  }
}
