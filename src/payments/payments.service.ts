import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ChargeStatus,
  MomoCollectionStatus,
  PaymentMethod,
  PaymentProofStatus,
  PaymentSource,
} from '@prisma/client';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovePaymentProofDto } from './dto/approve-payment-proof.dto';
import { InitiateMomoDto } from './dto/initiate-momo.dto';
import { MomoWebhookDto } from './dto/momo-webhook.dto';
import { RecordCashPaymentDto } from './dto/record-cash-payment.dto';
import { RejectPaymentProofDto } from './dto/reject-payment-proof.dto';
import { ReversePaymentDto } from './dto/reverse-payment.dto';
import { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';
import { MtnMomoClient } from './momo/mtn-momo.client';

const UNPAID_STATUSES: ChargeStatus[] = [
  ChargeStatus.PENDING,
  ChargeStatus.PARTIALLY_PAID,
  ChargeStatus.OVERDUE,
];

type ChargeRow = {
  id: string;
  companyId: string;
  householdId: string;
  totalAmountRwf: number;
  amountPaidRwf: number;
  billingPeriodId: string;
  status: ChargeStatus;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mtnMomo: MtnMomoClient,
  ) {}

  // ─── Manual cash / collector-recorded payments ────────────────────────────

  async recordCashPayment(
    householdId: string,
    dto: RecordCashPaymentDto,
    user: AuthenticatedUser,
  ) {
    const household = await this.getHousehold(householdId);
    this.assertCompanyScope(household.companyId, user.companyId);

    const charge = await this.resolveChargeForPeriod(
      household.companyId,
      householdId,
      dto.year,
      dto.month,
    );

    this.assertNotOverpaying(charge, dto.amountRwf);

    if (dto.momoTransactionId) {
      await this.assertTransactionNotSeen(dto.momoTransactionId);
    }

    const collectorId = user.role === 'COLLECTOR' ? user.sub : null;

    return this.createPaymentAndSettle({
      charge,
      amountRwf: dto.amountRwf,
      paymentMethod: (dto.paymentMethod as PaymentMethod) ?? PaymentMethod.CASH,
      source: PaymentSource.COLLECTOR,
      momoTransactionId: dto.momoTransactionId ?? null,
      collectorId,
      recordedById: user.sub,
      note: dto.note ?? null,
      paidAt: new Date(),
    });
  }

  // ─── Provider webhooks (MTN MoMo / Airtel Money) ──────────────────────────

  async handleProviderWebhook(payload: MomoWebhookDto, method: PaymentMethod) {
    if (payload.status !== 'SUCCESSFUL') {
      this.logger.log(
        `[Webhook] Ignoring ${method} txn ${payload.transactionId} with status ${payload.status}`,
      );
      return { received: true, processed: false, reason: 'not_successful' };
    }

    // Idempotency: a provider may retry the same callback. Never double-credit.
    const existing = await this.prisma.payment.findUnique({
      where: { momoTransactionId: payload.transactionId },
    });
    if (existing) {
      return { received: true, processed: false, reason: 'duplicate' };
    }

    const household = await this.matchHouseholdByPhone(payload.payerPhone);
    if (!household) {
      this.logger.warn(
        `[Webhook] No household matched phone ${payload.payerPhone} for txn ${payload.transactionId}`,
      );
      return { received: true, processed: false, reason: 'household_not_found' };
    }

    const charge = await this.findOldestUnpaidCharge(household.id);
    if (!charge) {
      this.logger.warn(
        `[Webhook] Household ${household.id} has no open charge for txn ${payload.transactionId}`,
      );
      return { received: true, processed: false, reason: 'no_open_charge' };
    }

    const remaining = charge.totalAmountRwf - charge.amountPaidRwf;
    const appliedAmount = Math.min(payload.amount, remaining);
    if (payload.amount > remaining) {
      this.logger.warn(
        `[Webhook] Payment ${payload.amount} exceeds remaining ${remaining} on charge ${charge.id}; surplus not allocated.`,
      );
    }

    await this.createPaymentAndSettle({
      charge,
      amountRwf: appliedAmount,
      paymentMethod: method,
      source: PaymentSource.SYSTEM,
      momoTransactionId: payload.transactionId,
      collectorId: null,
      recordedById: null,
      note:
        payload.amount !== appliedAmount
          ? `Received ${payload.amount} RWF; ${appliedAmount} RWF applied to charge.`
          : null,
      paidAt: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    });

    return { received: true, processed: true };
  }

  // ─── MTN MoMo RequestToPay (initiate + confirm) ───────────────────────────

  async initiateMomoCollection(
    householdId: string,
    dto: InitiateMomoDto,
    user: AuthenticatedUser,
  ) {
    if (!this.mtnMomo.isConfigured()) {
      throw new BadRequestException(
        'MTN MoMo is not configured. Set MOMO_MTN_* values in your environment.',
      );
    }

    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      select: { id: true, companyId: true, momoNumber: true, phoneNumber: true },
    });
    if (!household) throw new NotFoundException('Household not found');

    if (user.role === 'HOUSEHOLD' && user.householdId !== householdId) {
      throw new ForbiddenException('You can only pay for your own household');
    }
    this.assertCompanyScope(household.companyId, user.companyId);

    const charge = await this.resolveChargeForPeriod(
      household.companyId,
      householdId,
      dto.year,
      dto.month,
    );

    const remaining = charge.totalAmountRwf - charge.amountPaidRwf;
    const rawPhone = dto.payerPhone ?? household.momoNumber ?? household.phoneNumber;
    if (!rawPhone) {
      throw new BadRequestException('No phone number available to charge for this household');
    }
    const payerPhone = this.mtnMomo.normalizeMsisdn(rawPhone);

    const referenceId = randomUUID();
    const externalId = `WC-${charge.id.slice(0, 8)}-${Date.now()}`;

    const collection = await this.prisma.momoCollection.create({
      data: {
        referenceId,
        companyId: household.companyId,
        householdId,
        chargeId: charge.id,
        billingPeriodId: charge.billingPeriodId,
        payerPhone,
        amountRwf: remaining,
        currency: this.mtnMomo.currency,
        externalId,
        initiatedById: user.sub,
      },
    });

    try {
      await this.mtnMomo.requestToPay({
        referenceId,
        amount: String(remaining),
        currency: this.mtnMomo.currency,
        externalId,
        payerPhone,
        payerMessage: 'Waste collection fee',
        payeeNote: `Charge ${charge.id}`,
      });
    } catch (err) {
      await this.prisma.momoCollection.update({
        where: { id: collection.id },
        data: {
          status: MomoCollectionStatus.FAILED,
          failureReason: err?.message ?? 'Request to pay failed',
        },
      });
      throw err;
    }

    return {
      referenceId,
      status: MomoCollectionStatus.PENDING,
      householdId,
      amountRwf: remaining,
      payerPhone,
      message: 'Payment prompt sent to the payer. Poll the status endpoint to confirm.',
    };
  }

  async confirmMomoCollection(referenceId: string, user: AuthenticatedUser) {
    const collection = await this.prisma.momoCollection.findUnique({
      where: { referenceId },
    });
    if (!collection) throw new NotFoundException('MoMo collection not found');
    this.assertCompanyScope(collection.companyId, user.companyId);

    if (user.role === 'HOUSEHOLD' && user.householdId !== collection.householdId) {
      throw new ForbiddenException('You can only check your own payments');
    }

    // Already settled — idempotent return.
    if (collection.status === MomoCollectionStatus.SUCCESSFUL && collection.paymentId) {
      const payment = await this.prisma.payment.findUnique({
        where: { id: collection.paymentId },
      });
      return {
        referenceId,
        status: collection.status,
        settled: true,
        payment: payment ? this.toPaymentDto(payment) : null,
      };
    }

    const status = await this.mtnMomo.getRequestToPayStatus(referenceId);

    if (status.status === 'PENDING') {
      return { referenceId, status: MomoCollectionStatus.PENDING, settled: false };
    }

    if (status.status === 'FAILED') {
      await this.prisma.momoCollection.update({
        where: { id: collection.id },
        data: {
          status: MomoCollectionStatus.FAILED,
          failureReason: this.describeReason(status.reason),
        },
      });
      return {
        referenceId,
        status: MomoCollectionStatus.FAILED,
        settled: false,
        reason: this.describeReason(status.reason),
      };
    }

    // SUCCESSFUL — settle the charge once.
    const charge = await this.getChargeOrThrow(collection.chargeId);
    const remaining = charge.totalAmountRwf - charge.amountPaidRwf;

    if (remaining <= 0) {
      await this.prisma.momoCollection.update({
        where: { id: collection.id },
        data: {
          status: MomoCollectionStatus.SUCCESSFUL,
          financialTransactionId: status.financialTransactionId ?? null,
        },
      });
      return { referenceId, status: MomoCollectionStatus.SUCCESSFUL, settled: false, alreadyPaid: true };
    }

    const appliedAmount = Math.min(collection.amountRwf, remaining);

    const result = await this.createPaymentAndSettle({
      charge,
      amountRwf: appliedAmount,
      paymentMethod: PaymentMethod.MOMO_MTN,
      source: PaymentSource.SYSTEM,
      momoTransactionId: status.financialTransactionId ?? referenceId,
      collectorId: null,
      recordedById: collection.initiatedById,
      note: `MTN MoMo collection ${referenceId}`,
      paidAt: new Date(),
    });

    await this.prisma.momoCollection.update({
      where: { id: collection.id },
      data: {
        status: MomoCollectionStatus.SUCCESSFUL,
        financialTransactionId: status.financialTransactionId ?? null,
        paymentId: result.payment.id,
      },
    });

    return {
      referenceId,
      status: MomoCollectionStatus.SUCCESSFUL,
      settled: true,
      payment: result.payment,
      chargeStatus: result.chargeStatus,
      remainingBalanceRwf: result.remainingBalanceRwf,
    };
  }

  private describeReason(
    reason: string | { code?: string; message?: string } | undefined,
  ): string {
    if (!reason) return 'Payment failed';
    if (typeof reason === 'string') return reason;
    return reason.message ?? reason.code ?? 'Payment failed';
  }

  // ─── Household-submitted payment proofs (require approval) ─────────────────

  async submitProof(
    householdId: string,
    dto: SubmitPaymentProofDto,
    user: AuthenticatedUser,
  ) {
    const household = await this.getHousehold(householdId);

    // A household user may only submit proofs for their own household.
    if (user.role === 'HOUSEHOLD' && user.householdId !== householdId) {
      throw new ForbiddenException('You can only submit proofs for your own household');
    }
    this.assertCompanyScope(household.companyId, user.companyId);

    const charge = await this.resolveChargeForPeriod(
      household.companyId,
      householdId,
      dto.year,
      dto.month,
    );

    const proof = await this.prisma.paymentProof.create({
      data: {
        companyId: household.companyId,
        householdId,
        chargeId: charge.id,
        billingPeriodId: charge.billingPeriodId,
        submittedById: user.sub,
        claimedAmountRwf: dto.claimedAmountRwf,
        paymentMethod: dto.paymentMethod as PaymentMethod,
        momoTransactionId: dto.momoTransactionId ?? null,
        proofImageUrl: dto.proofImageUrl ?? null,
        note: dto.note ?? null,
      },
    });

    return this.toProofDto(proof);
  }

  async listProofs(
    companyId: string,
    status: PaymentProofStatus | undefined,
    user: AuthenticatedUser,
  ) {
    this.assertCompanyScope(companyId, user.companyId);

    const proofs = await this.prisma.paymentProof.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });

    return proofs.map((p) => this.toProofDto(p));
  }

  async approveProof(
    proofId: string,
    dto: ApprovePaymentProofDto,
    user: AuthenticatedUser,
  ) {
    const proof = await this.prisma.paymentProof.findUnique({ where: { id: proofId } });
    if (!proof) throw new NotFoundException('Payment proof not found');
    this.assertCompanyScope(proof.companyId, user.companyId);

    if (proof.status !== PaymentProofStatus.PENDING) {
      throw new BadRequestException(`Proof has already been ${proof.status.toLowerCase()}`);
    }
    if (!proof.chargeId) {
      throw new BadRequestException('Proof is not linked to a billing charge');
    }

    const charge = await this.getChargeOrThrow(proof.chargeId);
    const amountRwf = dto.amountRwf ?? proof.claimedAmountRwf;
    this.assertNotOverpaying(charge, amountRwf);

    if (proof.momoTransactionId) {
      await this.assertTransactionNotSeen(proof.momoTransactionId);
    }

    const result = await this.createPaymentAndSettle({
      charge,
      amountRwf,
      paymentMethod: proof.paymentMethod,
      source: PaymentSource.HOUSEHOLD_CLAIM,
      momoTransactionId: proof.momoTransactionId,
      collectorId: null,
      recordedById: user.sub,
      note: proof.note,
      paidAt: new Date(),
      proofId: proof.id,
    });

    await this.prisma.paymentProof.update({
      where: { id: proof.id },
      data: {
        status: PaymentProofStatus.APPROVED,
        reviewedById: user.sub,
        reviewedAt: new Date(),
        paymentId: result.payment.id,
      },
    });

    return result;
  }

  async rejectProof(
    proofId: string,
    dto: RejectPaymentProofDto,
    user: AuthenticatedUser,
  ) {
    const proof = await this.prisma.paymentProof.findUnique({ where: { id: proofId } });
    if (!proof) throw new NotFoundException('Payment proof not found');
    this.assertCompanyScope(proof.companyId, user.companyId);

    if (proof.status !== PaymentProofStatus.PENDING) {
      throw new BadRequestException(`Proof has already been ${proof.status.toLowerCase()}`);
    }

    const updated = await this.prisma.paymentProof.update({
      where: { id: proof.id },
      data: {
        status: PaymentProofStatus.REJECTED,
        reviewedById: user.sub,
        reviewedAt: new Date(),
        rejectionReason: dto.reason,
      },
    });

    return this.toProofDto(updated);
  }

  // ─── Reversal & reads ─────────────────────────────────────────────────────

  async reversePayment(
    paymentId: string,
    dto: ReversePaymentDto,
    user: AuthenticatedUser,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    this.assertCompanyScope(payment.companyId, user.companyId);

    if (payment.isReversed) {
      throw new BadRequestException('Payment has already been reversed');
    }

    return this.prisma.$transaction(async (tx) => {
      // Reverting the charge keeps payment records immutable (SEC-004): we never
      // delete a payment, we mark it reversed and undo its effect on the charge.
      if (payment.chargeId) {
        const charge = await tx.charge.findUnique({ where: { id: payment.chargeId } });
        if (charge) {
          const newPaid = Math.max(0, charge.amountPaidRwf - payment.amountRwf);
          await tx.charge.update({
            where: { id: charge.id },
            data: {
              amountPaidRwf: newPaid,
              status: this.deriveStatus(charge.totalAmountRwf, newPaid),
              paidAt: newPaid >= charge.totalAmountRwf ? charge.paidAt : null,
            },
          });
        }
      }

      const reversed = await tx.payment.update({
        where: { id: payment.id },
        data: {
          isReversed: true,
          reversalReason: dto.reason,
          reversedById: user.sub,
          reversedAt: new Date(),
        },
      });

      return this.toPaymentDto(reversed);
    });
  }

  async listHouseholdPayments(householdId: string, user: AuthenticatedUser) {
    const household = await this.getHousehold(householdId);
    if (user.role === 'HOUSEHOLD' && user.householdId !== householdId) {
      throw new ForbiddenException('You can only view your own household payments');
    }
    this.assertCompanyScope(household.companyId, user.companyId);

    const payments = await this.prisma.payment.findMany({
      where: { householdId },
      orderBy: { paidAt: 'desc' },
    });

    return payments.map((p) => this.toPaymentDto(p));
  }

  async getPayment(paymentId: string, user: AuthenticatedUser) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    this.assertCompanyScope(payment.companyId, user.companyId);
    return this.toPaymentDto(payment);
  }

  // ─── Core settlement ──────────────────────────────────────────────────────

  private async createPaymentAndSettle(params: {
    charge: ChargeRow;
    amountRwf: number;
    paymentMethod: PaymentMethod;
    source: PaymentSource;
    momoTransactionId: string | null;
    collectorId: string | null;
    recordedById: string | null;
    note: string | null;
    paidAt: Date;
    proofId?: string;
  }) {
    const { charge, amountRwf } = params;
    const newPaid = charge.amountPaidRwf + amountRwf;
    const newStatus = this.deriveStatus(charge.totalAmountRwf, newPaid);

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          companyId: charge.companyId,
          householdId: charge.householdId,
          chargeId: charge.id,
          billingPeriodId: charge.billingPeriodId,
          collectorId: params.collectorId,
          amountRwf,
          paymentMethod: params.paymentMethod,
          momoTransactionId: params.momoTransactionId,
          source: params.source,
          paidAt: params.paidAt,
          note: params.note,
          recordedById: params.recordedById,
        },
      });

      await tx.charge.update({
        where: { id: charge.id },
        data: {
          amountPaidRwf: newPaid,
          status: newStatus,
          paidAt: newStatus === ChargeStatus.PAID ? params.paidAt : null,
        },
      });

      // ── Hook points for upcoming modules ──
      // TODO(receipts): generate a digital receipt for `created` here.
      // TODO(reminders): stop pending reminders for this charge here.

      return created;
    });

    return {
      payment: this.toPaymentDto(payment),
      chargeStatus: newStatus,
      remainingBalanceRwf: charge.totalAmountRwf - newPaid,
    };
  }

  private deriveStatus(totalAmountRwf: number, amountPaidRwf: number): ChargeStatus {
    if (amountPaidRwf <= 0) return ChargeStatus.PENDING;
    if (amountPaidRwf >= totalAmountRwf) return ChargeStatus.PAID;
    return ChargeStatus.PARTIALLY_PAID;
  }

  // ─── Lookups & guards ─────────────────────────────────────────────────────

  private async getHousehold(householdId: string) {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      select: { id: true, companyId: true },
    });
    if (!household) throw new NotFoundException('Household not found');
    return household;
  }

  private async getChargeOrThrow(chargeId: string): Promise<ChargeRow> {
    const charge = await this.prisma.charge.findUnique({
      where: { id: chargeId },
      select: {
        id: true,
        companyId: true,
        householdId: true,
        totalAmountRwf: true,
        amountPaidRwf: true,
        billingPeriodId: true,
        status: true,
      },
    });
    if (!charge) throw new NotFoundException('Charge not found');
    return charge;
  }

  private async resolveChargeForPeriod(
    companyId: string,
    householdId: string,
    year: number,
    month: number,
  ): Promise<ChargeRow> {
    const period = await this.prisma.billingPeriod.findUnique({
      where: { companyId_year_month: { companyId, year, month } },
    });
    if (!period) {
      throw new BadRequestException(
        `No billing period exists for ${year}-${String(month).padStart(2, '0')}. Create it and generate charges first.`,
      );
    }

    const charge = await this.prisma.charge.findUnique({
      where: {
        billingPeriodId_householdId: { billingPeriodId: period.id, householdId },
      },
      select: {
        id: true,
        companyId: true,
        householdId: true,
        totalAmountRwf: true,
        amountPaidRwf: true,
        billingPeriodId: true,
        status: true,
      },
    });
    if (!charge) {
      throw new BadRequestException(
        'No charge found for this household in that period. Generate charges first.',
      );
    }
    if (charge.status === ChargeStatus.PAID) {
      throw new BadRequestException('This charge is already fully paid');
    }
    if (charge.status === ChargeStatus.WAIVED) {
      throw new BadRequestException('This charge has been waived');
    }
    return charge;
  }

  private async findOldestUnpaidCharge(householdId: string): Promise<ChargeRow | null> {
    return this.prisma.charge.findFirst({
      where: { householdId, status: { in: UNPAID_STATUSES } },
      orderBy: { billingPeriod: { periodStart: 'asc' } },
      select: {
        id: true,
        companyId: true,
        householdId: true,
        totalAmountRwf: true,
        amountPaidRwf: true,
        billingPeriodId: true,
        status: true,
      },
    });
  }

  private async matchHouseholdByPhone(phone: string) {
    const normalized = this.normalizePhone(phone);
    const candidates = await this.prisma.household.findMany({
      where: {
        OR: [
          { momoNumber: { contains: normalized } },
          { phoneNumber: { contains: normalized } },
        ],
      },
      select: { id: true, companyId: true },
      take: 2,
    });
    if (candidates.length === 0) return null;
    return candidates[0];
  }

  /** Reduce a Rwandan phone number to its last 9 significant digits for matching. */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-9);
  }

  private assertNotOverpaying(charge: ChargeRow, amountRwf: number) {
    const remaining = charge.totalAmountRwf - charge.amountPaidRwf;
    if (amountRwf > remaining) {
      throw new BadRequestException(
        `Amount ${amountRwf} RWF exceeds the remaining balance of ${remaining} RWF for this charge`,
      );
    }
  }

  private async assertTransactionNotSeen(momoTransactionId: string) {
    const existing = await this.prisma.payment.findUnique({
      where: { momoTransactionId },
    });
    if (existing) {
      throw new BadRequestException(
        'A payment with this transaction reference already exists',
      );
    }
  }

  private assertCompanyScope(companyId: string, requesterCompanyId?: string | null) {
    if (requesterCompanyId && requesterCompanyId !== companyId) {
      throw new ForbiddenException('Cannot access another company workspace');
    }
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private toPaymentDto(p: {
    id: string;
    companyId: string;
    householdId: string;
    chargeId: string | null;
    billingPeriodId: string | null;
    collectorId: string | null;
    amountRwf: number;
    paymentMethod: PaymentMethod;
    momoTransactionId: string | null;
    source: PaymentSource;
    paidAt: Date;
    isReversed: boolean;
    reversalReason: string | null;
    createdAt: Date;
  }) {
    return {
      id: p.id,
      companyId: p.companyId,
      householdId: p.householdId,
      chargeId: p.chargeId,
      billingPeriodId: p.billingPeriodId,
      collectorId: p.collectorId,
      amountRwf: p.amountRwf,
      paymentMethod: p.paymentMethod,
      momoTransactionId: p.momoTransactionId,
      source: p.source,
      paidAt: p.paidAt,
      isReversed: p.isReversed,
      reversalReason: p.reversalReason,
      createdAt: p.createdAt,
    };
  }

  private toProofDto(p: {
    id: string;
    companyId: string;
    householdId: string;
    chargeId: string | null;
    billingPeriodId: string | null;
    claimedAmountRwf: number;
    paymentMethod: PaymentMethod;
    momoTransactionId: string | null;
    proofImageUrl: string | null;
    note: string | null;
    status: PaymentProofStatus;
    reviewedById: string | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    paymentId: string | null;
    createdAt: Date;
  }) {
    return {
      id: p.id,
      companyId: p.companyId,
      householdId: p.householdId,
      chargeId: p.chargeId,
      billingPeriodId: p.billingPeriodId,
      claimedAmountRwf: p.claimedAmountRwf,
      paymentMethod: p.paymentMethod,
      momoTransactionId: p.momoTransactionId,
      proofImageUrl: p.proofImageUrl,
      note: p.note,
      status: p.status,
      reviewedById: p.reviewedById,
      reviewedAt: p.reviewedAt,
      rejectionReason: p.rejectionReason,
      paymentId: p.paymentId,
      createdAt: p.createdAt,
    };
  }
}
