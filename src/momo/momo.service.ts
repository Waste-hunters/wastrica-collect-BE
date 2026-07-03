import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

type MomoConfig = {
  apiKey?: string;
  apiUser?: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
};

@Injectable()
export class MomoService {
  private config: MomoConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      apiKey: this.configService.get<string>('MOMO_API_KEY'),
      apiUser: this.configService.get<string>('MOMO_API_USER'),
      environment: (this.configService.get<string>('MOMO_ENVIRONMENT') as 'sandbox' | 'production') ?? 'sandbox',
      callbackUrl:
        this.configService.get<string>('MOMO_CALLBACK_URL') ??
        'http://localhost:3000/collect/v1/momo/webhook',
    };
  }

  async initiatePayment(params: {
    chargeId: string;
    method: string;
    phone: string;
    amountRwf: number;
  }) {
    const charge = await this.prisma.charge.findUnique({
      where: { id: params.chargeId },
    });

    if (!charge) throw new NotFoundException('Charge not found');
    if (charge.status === 'PAID') {
      throw new BadRequestException('Charge is already paid');
    }

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        chargeId: params.chargeId,
        method: params.method,
        phoneNumber: params.phone,
        amountRwf: params.amountRwf,
        status: 'PENDING',
      },
    });

    // In sandbox mode, simulate MoMo USSD push and auto-complete after delay
    if (this.config.environment === 'sandbox') {
      this.simulateAsyncPaymentCompletion(transaction.id, params.chargeId);
    }

    return {
      success: true,
      status: 'PENDING' as const,
      transactionId: transaction.id,
      message: 'Payment initiated. Check your phone to complete.',
    };
  }

  async getPaymentStatus(chargeId: string) {
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { chargeId },
      orderBy: { createdAt: 'desc' },
    });

    if (!transaction) {
      const charge = await this.prisma.charge.findUnique({
        where: { id: chargeId },
      });
      if (!charge) throw new NotFoundException('Charge not found');

      return {
        status: charge.status === 'PAID' ? 'SUCCESSFUL' : 'NOT_INITIATED',
        transactionId: null,
      };
    }

    return {
      status: transaction.status,
      transactionId: transaction.id,
      providerRef: transaction.providerRef,
      initiatedAt: transaction.initiatedAt,
      completedAt: transaction.completedAt,
    };
  }

  async handleCallback(dto: {
    transactionId: string;
    status: 'SUCCESSFUL' | 'FAILED';
    providerRef?: string;
    failureReason?: string;
  }) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: dto.transactionId },
      include: { charge: true },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.status !== 'PENDING') {
      throw new BadRequestException('Transaction is already finalized');
    }

    const completedAt = new Date();

    if (dto.status === 'SUCCESSFUL') {
      await this.prisma.$transaction([
        this.prisma.paymentTransaction.update({
          where: { id: dto.transactionId },
          data: {
            status: 'SUCCESSFUL',
            providerRef: dto.providerRef,
            completedAt,
          },
        }),
        this.prisma.charge.update({
          where: { id: transaction.chargeId },
          data: {
            status: 'PAID',
            amountPaidRwf: transaction.amountRwf,
            paidAt: completedAt,
          },
        }),
      ]);

      return { success: true, status: 'SUCCESSFUL' as const };
    }

    await this.prisma.paymentTransaction.update({
      where: { id: dto.transactionId },
      data: {
        status: 'FAILED',
        providerRef: dto.providerRef,
        completedAt,
      },
    });

    return { success: false, status: 'FAILED' as const, reason: dto.failureReason };
  }

  private async simulateAsyncPaymentCompletion(transactionId: string, chargeId: string) {
    const delayMs = 8000;

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    try {
      await this.handleCallback({
        transactionId,
        status: 'SUCCESSFUL',
        providerRef: `MOCK-REF-${Date.now()}`,
      });
    } catch {
      // Transaction might have been completed via webhook already
    }
  }
}
