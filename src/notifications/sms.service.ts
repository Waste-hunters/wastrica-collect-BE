import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type AfricaTalkingSms = {
  send(options: {
    to: string | string[];
    message: string;
    senderId?: string;
    enqueue?: boolean;
  }): Promise<unknown>;
};

@Injectable()
export class SmsService {
  private readonly sms: AfricaTalkingSms;
  private readonly senderId?: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('AFRICASTALKING_API_KEY');
    const username = this.configService.get<string>('AFRICASTALKING_USERNAME');
    this.senderId = this.configService.get<string>('AFRICASTALKING_SENDER_ID');

    if (!apiKey || !username) {
      return;
    }

    // The official Africa's Talking SDK is CommonJS.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const africasTalking = require('africastalking')({
      apiKey,
      username,
    });

    this.sms = africasTalking.SMS;
  }

  async sendOtp(phoneNumber: string, code: string) {
    if (!this.sms) {
      throw new InternalServerErrorException(
        'Africa’s Talking SMS is not configured. Set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME.',
      );
    }

    const message = `Your Wastrica Collect OTP is ${code}. It expires in 5 minutes.`;

    try {
      return await this.sms.send({
        to: phoneNumber,
        message,
        senderId: this.senderId,
        enqueue: true,
      });
    } catch (error) {
      throw new BadGatewayException({
        message: 'Failed to send OTP SMS through Africa’s Talking',
        providerError: this.formatProviderError(error),
      });
    }
  }

  private formatProviderError(error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { data?: unknown; status?: number } })
        .response;

      return {
        status: response?.status,
        data: response?.data,
      };
    }

    if (error instanceof Error) {
      return error.message;
    }

    return error;
  }
}
