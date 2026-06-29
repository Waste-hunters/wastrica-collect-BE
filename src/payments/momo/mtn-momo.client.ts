import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RequestToPayParams {
  referenceId: string;
  amount: string;
  currency: string;
  externalId: string;
  payerPhone: string;
  payerMessage: string;
  payeeNote: string;
}

export interface RequestToPayStatus {
  amount: string;
  currency: string;
  externalId: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  financialTransactionId?: string;
  reason?: string | { code?: string; message?: string };
}

/**
 * Thin client over MTN MoMo Collections API.
 *
 * Sandbox base URL: https://sandbox.momodeveloper.mtn.com
 * Auth: a short-lived bearer token obtained with Basic(apiUser:apiKey) + the
 * Collections subscription key. We cache the token in memory until it expires.
 */
@Injectable()
export class MtnMomoClient {
  private readonly logger = new Logger(MtnMomoClient.name);
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('MOMO_MTN_SUBSCRIPTION_KEY') &&
        this.configService.get<string>('MOMO_MTN_API_USER') &&
        this.configService.get<string>('MOMO_MTN_API_KEY'),
    );
  }

  get environment(): string {
    return this.configService.get<string>('MOMO_MTN_ENVIRONMENT') ?? 'sandbox';
  }

  /** Sandbox forces EUR; live Rwanda uses RWF. Configurable via MOMO_MTN_CURRENCY. */
  get currency(): string {
    const configured = this.configService.get<string>('MOMO_MTN_CURRENCY');
    if (configured) return configured;
    return this.environment === 'sandbox' ? 'EUR' : 'RWF';
  }

  private get baseUrl(): string {
    return (
      this.configService.get<string>('MOMO_MTN_BASE_URL') ??
      'https://sandbox.momodeveloper.mtn.com'
    );
  }

  private get subscriptionKey(): string {
    const key = this.configService.get<string>('MOMO_MTN_SUBSCRIPTION_KEY');
    if (!key) {
      throw new InternalServerErrorException(
        'MOMO_MTN_SUBSCRIPTION_KEY is not configured',
      );
    }
    return key;
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 30_000) {
      return this.cachedToken.value;
    }

    const apiUser = this.configService.get<string>('MOMO_MTN_API_USER');
    const apiKey = this.configService.get<string>('MOMO_MTN_API_KEY');
    if (!apiUser || !apiKey) {
      throw new InternalServerErrorException(
        'MOMO_MTN_API_USER / MOMO_MTN_API_KEY are not configured',
      );
    }

    const basic = Buffer.from(`${apiUser}:${apiKey}`).toString('base64');

    const res = await fetch(`${this.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`MoMo token request failed (${res.status}): ${body}`);
      throw new InternalServerErrorException('Failed to obtain MoMo access token');
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  }

  async requestToPay(params: RequestToPayParams): Promise<void> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': params.referenceId,
        'X-Target-Environment': this.environment,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        externalId: params.externalId,
        payer: { partyIdType: 'MSISDN', partyId: params.payerPhone },
        payerMessage: params.payerMessage,
        payeeNote: params.payeeNote,
      }),
    });

    // MTN returns 202 Accepted with an empty body on success.
    if (res.status !== 202) {
      const body = await res.text();
      this.logger.error(`MoMo requestToPay failed (${res.status}): ${body}`);
      throw new InternalServerErrorException(
        `MoMo payment request was rejected (status ${res.status})`,
      );
    }
  }

  async getRequestToPayStatus(referenceId: string): Promise<RequestToPayStatus> {
    const token = await this.getAccessToken();

    const res = await fetch(
      `${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Target-Environment': this.environment,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        },
      },
    );

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`MoMo status request failed (${res.status}): ${body}`);
      throw new InternalServerErrorException('Failed to fetch MoMo payment status');
    }

    return (await res.json()) as RequestToPayStatus;
  }

  /** Normalise a Rwandan phone number to MSISDN (e.g. 250781234567). */
  normalizeMsisdn(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('250')) return digits;
    if (digits.startsWith('0')) return `250${digits.slice(1)}`;
    if (digits.length === 9) return `250${digits}`;
    return digits;
  }
}
