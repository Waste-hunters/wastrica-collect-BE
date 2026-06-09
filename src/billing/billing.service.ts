import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillingPeriodDto } from './dto/create-billing-period.dto';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Billing Periods ──────────────────────────────────────────────────────

  async listBillingPeriods(companyId: string, requesterCompanyId?: string | null) {
    this.assertCompanyScope(companyId, requesterCompanyId);

    const periods = await this.prisma.billingPeriod.findMany({
      where: { companyId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return periods.map((p) => this.toBillingPeriodDto(p));
  }

  async createBillingPeriod(
    companyId: string,
    dto: CreateBillingPeriodDto,
    requesterCompanyId?: string | null,
  ) {
    this.assertCompanyScope(companyId, requesterCompanyId);

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const existing = await this.prisma.billingPeriod.findUnique({
      where: { companyId_year_month: { companyId, year: dto.year, month: dto.month } },
    });
    if (existing) {
      throw new BadRequestException(
        `Billing period for ${dto.year}-${String(dto.month).padStart(2, '0')} already exists`,
      );
    }

    const periodStart = new Date(Date.UTC(dto.year, dto.month - 1, 1));
    const periodEnd = new Date(Date.UTC(dto.year, dto.month, 0)); // last day of month

    const period = await this.prisma.billingPeriod.create({
      data: { companyId, year: dto.year, month: dto.month, periodStart, periodEnd },
    });

    return this.toBillingPeriodDto(period);
  }

  async getBillingPeriod(id: string, requesterCompanyId?: string | null) {
    const period = await this.prisma.billingPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException('Billing period not found');
    this.assertCompanyScope(period.companyId, requesterCompanyId);

    const charges = await this.prisma.charge.findMany({
      where: { billingPeriodId: id },
      select: { status: true, totalAmountRwf: true, amountPaidRwf: true },
    });

    const totalExpectedRwf = charges.reduce((s, c) => s + c.totalAmountRwf, 0);
    const totalCollectedRwf = charges.reduce((s, c) => s + c.amountPaidRwf, 0);
    const paidCount = charges.filter((c) => c.status === 'PAID').length;
    const overdueCount = charges.filter((c) => c.status === 'OVERDUE').length;
    const pendingCount = charges.filter(
      (c) => c.status === 'PENDING' || c.status === 'PARTIALLY_PAID',
    ).length;
    const collectionRatePercent =
      charges.length > 0
        ? Math.round((paidCount / charges.length) * 1000) / 10
        : 0;

    return {
      ...this.toBillingPeriodDto(period),
      totalHouseholds: charges.length,
      totalExpectedRwf,
      totalCollectedRwf,
      collectionRatePercent,
      paidCount,
      pendingCount,
      overdueCount,
    };
  }

  async generateCharges(periodId: string, requesterCompanyId?: string | null) {
    const period = await this.prisma.billingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Billing period not found');
    this.assertCompanyScope(period.companyId, requesterCompanyId);

    // Idempotent: if charges already generated, return current totals
    if (period.status !== 'OPEN') {
      const existing = await this.prisma.charge.aggregate({
        where: { billingPeriodId: periodId },
        _count: { id: true },
        _sum: { totalAmountRwf: true },
      });
      return {
        billingPeriodId: periodId,
        chargesCreated: 0,
        skipped: existing._count.id,
        totalExpectedRwf: existing._sum.totalAmountRwf ?? 0,
      };
    }

    const households = await this.prisma.household.findMany({
      where: { companyId: period.companyId, status: 'ACTIVE' },
      select: { id: true, monthlyFeeRwf: true, collectionDay: true },
    });

    if (households.length === 0) {
      throw new BadRequestException(
        'No active households found for this company. Register and verify households first.',
      );
    }

    const chargesData = households.map((h) => {
      // Due date: collection day within the billing month, clamped to last day of month
      const lastDay = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
      const day = Math.min(h.collectionDay, lastDay);
      const dueDate = new Date(Date.UTC(period.year, period.month - 1, day));

      return {
        billingPeriodId: periodId,
        householdId: h.id,
        companyId: period.companyId,
        baseFeeRwf: h.monthlyFeeRwf,
        totalAmountRwf: h.monthlyFeeRwf,
        dueDate,
      };
    });

    const totalExpectedRwf = chargesData.reduce((s, c) => s + c.totalAmountRwf, 0);

    await this.prisma.$transaction([
      this.prisma.charge.createMany({ data: chargesData, skipDuplicates: true }),
      this.prisma.billingPeriod.update({
        where: { id: periodId },
        data: { status: 'ACTIVE', chargesGeneratedAt: new Date() },
      }),
    ]);

    return {
      billingPeriodId: periodId,
      chargesCreated: chargesData.length,
      skipped: 0,
      totalExpectedRwf,
    };
  }

  // ─── Household balance & payment status ──────────────────────────────────

  async getHouseholdBalance(householdId: string, requesterCompanyId?: string | null) {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      select: { id: true, companyId: true, householdCode: true, residentName: true },
    });
    if (!household) throw new NotFoundException('Household not found');
    this.assertCompanyScope(household.companyId, requesterCompanyId);

    const openCharges = await this.prisma.charge.findMany({
      where: {
        householdId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
      },
      include: {
        billingPeriod: { select: { periodStart: true, year: true, month: true } },
      },
      orderBy: { billingPeriod: { periodStart: 'asc' } },
    });

    const totalOutstandingRwf = openCharges.reduce(
      (s, c) => s + (c.totalAmountRwf - c.amountPaidRwf),
      0,
    );
    const overdueAmountRwf = openCharges
      .filter((c) => c.status === 'OVERDUE')
      .reduce((s, c) => s + (c.totalAmountRwf - c.amountPaidRwf), 0);

    return {
      householdId: household.id,
      householdCode: household.householdCode,
      residentName: household.residentName,
      totalOutstandingRwf,
      overdueAmountRwf,
      openChargesCount: openCharges.length,
      oldestUnpaidPeriodStart: openCharges[0]?.billingPeriod?.periodStart ?? null,
    };
  }

  async getHouseholdPaymentStatus(householdId: string, requesterCompanyId?: string | null) {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      select: { id: true, companyId: true, residentName: true },
    });
    if (!household) throw new NotFoundException('Household not found');
    this.assertCompanyScope(household.companyId, requesterCompanyId);

    // Most recent ACTIVE or CLOSED billing period for this company
    const latestPeriod = await this.prisma.billingPeriod.findFirst({
      where: {
        companyId: household.companyId,
        status: { in: ['ACTIVE', 'CLOSED'] },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    if (!latestPeriod) {
      return {
        householdId: household.id,
        residentName: household.residentName,
        currentPeriod: null,
        status: 'NO_PERIOD',
        amountDueRwf: 0,
        amountPaidRwf: 0,
        remainingBalanceRwf: 0,
        dueDate: null,
        isOverdue: false,
      };
    }

    const currentPeriod = {
      id: latestPeriod.id,
      year: latestPeriod.year,
      month: latestPeriod.month,
      periodStart: latestPeriod.periodStart,
      periodEnd: latestPeriod.periodEnd,
    };

    const charge = await this.prisma.charge.findUnique({
      where: {
        billingPeriodId_householdId: {
          billingPeriodId: latestPeriod.id,
          householdId,
        },
      },
    });

    if (!charge) {
      return {
        householdId: household.id,
        residentName: household.residentName,
        currentPeriod,
        status: 'NO_CHARGE',
        amountDueRwf: 0,
        amountPaidRwf: 0,
        remainingBalanceRwf: 0,
        dueDate: null,
        isOverdue: false,
      };
    }

    return {
      householdId: household.id,
      residentName: household.residentName,
      currentPeriod,
      status: charge.status,
      amountDueRwf: charge.totalAmountRwf,
      amountPaidRwf: charge.amountPaidRwf,
      remainingBalanceRwf: charge.totalAmountRwf - charge.amountPaidRwf,
      dueDate: charge.dueDate,
      isOverdue: charge.status === 'OVERDUE',
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private assertCompanyScope(companyId: string, requesterCompanyId?: string | null) {
    if (requesterCompanyId && requesterCompanyId !== companyId) {
      throw new ForbiddenException('Cannot access another company workspace');
    }
  }

  private toBillingPeriodDto(p: {
    id: string;
    companyId: string;
    year: number;
    month: number;
    periodStart: Date;
    periodEnd: Date;
    status: string;
    chargesGeneratedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: p.id,
      companyId: p.companyId,
      year: p.year,
      month: p.month,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      status: p.status,
      chargesGeneratedAt: p.chargesGeneratedAt,
      createdAt: p.createdAt,
    };
  }
}
