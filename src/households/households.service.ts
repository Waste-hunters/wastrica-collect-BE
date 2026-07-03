import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivateHouseholdDto } from './dto/activate-household.dto';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { ImportHouseholdsDto } from './dto/import-households.dto';
import { RegisterHouseholdDto } from './dto/register-household.dto';
import { UpdateHouseholdFeeDto } from './dto/update-household-fee.dto';
import { UpdateHouseholdStatusDto } from './dto/update-household-status.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';

@Injectable()
export class HouseholdsService {
  private readonly logger = new Logger(HouseholdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  async list(companyId: string, requesterCompanyId?: string | null) {
    this.assertCompanyScope(companyId, requesterCompanyId);

    return this.prisma.household.findMany({
      where: { companyId },
      include: { collector: true, route: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    companyId: string,
    dto: CreateHouseholdDto,
    requesterCompanyId?: string | null,
  ) {
    this.assertCompanyScope(companyId, requesterCompanyId);
    await this.validateAssignments(companyId, dto.collectorId, dto.routeId);

    const householdCode =
      dto.householdCode ?? (await this.generateHouseholdCode(companyId));

    const household = await this.prisma.household.create({
      data: {
        companyId,
        householdCode,
        residentName: dto.residentName,
        phoneNumber: dto.phoneNumber,
        momoNumber: dto.momoNumber,
        sector: dto.sector,
        cell: dto.cell,
        village: dto.village,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        monthlyFeeRwf: dto.monthlyFeeRwf,
        collectionDay: dto.collectionDay,
        collectorId: dto.collectorId,
        routeId: dto.routeId,
        email: dto.email,
      },
    });

    if (dto.email) {
      await this.sendEmailOtp(household.id, dto.email, dto.residentName).catch((err) => {
        this.logger.error(`Failed to send OTP to ${dto.email} for household ${household.id}: ${err?.message}`);
      });
    }

    return household;
  }

  async activate(id: string, dto: ActivateHouseholdDto, requesterCompanyId?: string | null) {
    const household = await this.findOne(id, requesterCompanyId).catch(() => null)
      ?? await this.prisma.household.findUnique({ where: { id } });

    if (!household) throw new NotFoundException('Household not found');

    if (!household.email) {
      throw new BadRequestException('This household has no email registered');
    }
    if (household.emailVerifiedAt) {
      throw new BadRequestException('Household account already activated');
    }

    // Find the most recent valid, unconsumed OTP challenge for this email
    const challenge = await this.prisma.emailOtpChallenge.findFirst({
      where: {
        email: household.email,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new UnauthorizedException('No valid OTP found. Request a new one.');
    }

    const isValid = await bcrypt.compare(dto.otp, challenge.codeHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [user] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          fullName: household.residentName,
          phoneNumber: household.phoneNumber,
          email: household.email,
          role: 'HOUSEHOLD',
          status: 'ACTIVE',
          companyId: household.companyId,
          passwordHash,
          householdId: household.id,
        },
      }),
      this.prisma.household.update({
        where: { id: household.id },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailOtpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      companyId: user.companyId,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        householdId: household.id,
      },
    };
  }

  async resendOtp(id: string, requesterCompanyId?: string | null) {
    const household = await this.findOne(id, requesterCompanyId);

    if (!household.email) {
      throw new BadRequestException('This household has no email registered');
    }
    if (household.emailVerifiedAt) {
      throw new BadRequestException('Household account is already activated');
    }

    await this.sendEmailOtp(household.id, household.email, household.residentName);
    return { sent: true, email: household.email };
  }

  async sendEmailOtp(_householdId: string, email: string, residentName: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.emailOtpChallenge.create({
      data: { email, codeHash, expiresAt },
    });

    await this.emailService.sendOtp(email, otp, residentName);
  }

  async import(companyId: string, dto: ImportHouseholdsDto, requesterCompanyId?: string | null) {
    this.assertCompanyScope(companyId, requesterCompanyId);

    const created: Awaited<ReturnType<typeof this.create>>[] = [];
    for (const household of dto.households) {
      created.push(await this.create(companyId, household, requesterCompanyId));
    }

    return {
      imported: created.length,
      households: created,
    };
  }

  async findOne(id: string, requesterCompanyId?: string | null) {
    const household = await this.prisma.household.findUnique({
      where: { id },
      include: { collector: true, route: true, feeHistory: true },
    });

    if (!household) {
      throw new NotFoundException('Household not found');
    }

    this.assertCompanyScope(household.companyId, requesterCompanyId);
    return household;
  }

  async update(id: string, dto: UpdateHouseholdDto, requesterCompanyId?: string | null) {
    const existing = await this.findOne(id, requesterCompanyId);
    await this.validateAssignments(existing.companyId, dto.collectorId, dto.routeId);

    return this.prisma.household.update({
      where: { id },
      data: {
        householdCode: dto.householdCode,
        residentName: dto.residentName,
        phoneNumber: dto.phoneNumber,
        momoNumber: dto.momoNumber,
        sector: dto.sector,
        cell: dto.cell,
        village: dto.village,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        monthlyFeeRwf: dto.monthlyFeeRwf,
        collectionDay: dto.collectionDay,
        collectorId: dto.collectorId,
        routeId: dto.routeId,
      },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateHouseholdStatusDto,
    requesterCompanyId?: string | null,
  ) {
    await this.findOne(id, requesterCompanyId);

    return this.prisma.household.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async verify(id: string, requesterCompanyId?: string | null) {
    await this.findOne(id, requesterCompanyId);

    return this.prisma.household.update({
      where: { id },
      data: { verifiedAt: new Date() },
    });
  }

  async updateFee(
    id: string,
    dto: UpdateHouseholdFeeDto,
    changedById: string,
    requesterCompanyId?: string | null,
  ) {
    const existing = await this.findOne(id, requesterCompanyId);

    return this.prisma.$transaction(async (tx) => {
      await tx.householdFeeHistory.create({
        data: {
          householdId: id,
          previousFeeRwf: existing.monthlyFeeRwf,
          newFeeRwf: dto.monthlyFeeRwf,
          effectiveFrom: new Date(dto.effectiveFrom),
          reason: dto.reason,
          changedById,
        },
      });

      return tx.household.update({
        where: { id },
        data: { monthlyFeeRwf: dto.monthlyFeeRwf },
      });
    });
  }

  private async validateAssignments(
    companyId: string,
    collectorId?: string,
    routeId?: string,
  ) {
    if (collectorId) {
      const collector = await this.prisma.user.findUnique({
        where: { id: collectorId },
      });

      if (
        !collector ||
        collector.companyId !== companyId ||
        collector.role !== 'COLLECTOR'
      ) {
        throw new BadRequestException('Collector does not belong to this company');
      }
    }

    if (routeId) {
      const route = await this.prisma.route.findUnique({ where: { id: routeId } });

      if (!route || route.companyId !== companyId) {
        throw new BadRequestException('Route does not belong to this company');
      }
    }
  }

  private async generateHouseholdCode(companyId: string) {
    const count = await this.prisma.household.count({ where: { companyId } });
    return `HH-${(count + 1).toString().padStart(5, '0')}`;
  }

  private assertCompanyScope(companyId: string, requesterCompanyId?: string | null) {
    if (companyId !== requesterCompanyId) {
      throw new ForbiddenException('Cannot access another company workspace');
    }
  }

  async register(userId: string, dto: RegisterHouseholdDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.householdId) {
      throw new BadRequestException('User is already linked to a household');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    const householdCode = await this.generateHouseholdCode(dto.companyId);

    const household = await this.prisma.household.create({
      data: {
        companyId: dto.companyId,
        householdCode,
        residentName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        momoNumber: dto.momoNumber || user.phoneNumber,
        sector: dto.sector,
        cell: dto.cell,
        village: dto.village,
        address: dto.address,
        monthlyFeeRwf: dto.monthlyFeeRwf,
        collectionDay: dto.collectionDay,
        status: 'ACTIVE',
        verifiedAt: null, // initially null
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        householdId: household.id,
        companyId: dto.companyId,
      },
    });

    return household;
  }

  async getMeStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        household: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      linked: !!user.householdId,
      verified: !!user.household?.verifiedAt,
      household: user.household ? {
        id: user.household.id,
        householdCode: user.household.householdCode,
        residentName: user.household.residentName,
        phoneNumber: user.household.phoneNumber,
        momoNumber: user.household.momoNumber,
        sector: user.household.sector,
        cell: user.household.cell,
        village: user.household.village,
        address: user.household.address,
        monthlyFeeRwf: user.household.monthlyFeeRwf,
        collectionDay: user.household.collectionDay,
        status: user.household.status,
        verifiedAt: user.household.verifiedAt,
        companyId: user.household.companyId,
        companyName: user.household.company.name,
      } : null,
    };
  }

  async simulateActive(id: string) {
    const household = await this.prisma.household.findUnique({
      where: { id },
    });
    if (!household) throw new NotFoundException('Household not found');

    // Update household to verified
    const updatedHousehold = await this.prisma.household.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        status: 'ACTIVE',
      },
    });

    // Create current billing period if it doesn't exist
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed

    let period = await this.prisma.billingPeriod.findUnique({
      where: {
        companyId_year_month: {
          companyId: household.companyId,
          year,
          month,
        },
      },
    });

    if (!period) {
      const periodStart = new Date(Date.UTC(year, month - 1, 1));
      const periodEnd = new Date(Date.UTC(year, month, 0));
      period = await this.prisma.billingPeriod.create({
        data: {
          companyId: household.companyId,
          year,
          month,
          periodStart,
          periodEnd,
          status: 'ACTIVE',
          chargesGeneratedAt: new Date(),
        },
      });
    } else if (period.status === 'OPEN') {
      period = await this.prisma.billingPeriod.update({
        where: { id: period.id },
        data: { status: 'ACTIVE', chargesGeneratedAt: new Date() },
      });
    }

    // Create charge for the household in this period if not exists
    let charge = await this.prisma.charge.findUnique({
      where: {
        billingPeriodId_householdId: {
          billingPeriodId: period.id,
          householdId: id,
        },
      },
    });

    let chargeCreated = false;
    if (!charge) {
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const day = Math.min(household.collectionDay, lastDay);
      const dueDate = new Date(Date.UTC(year, month - 1, day));

      charge = await this.prisma.charge.create({
        data: {
          billingPeriodId: period.id,
          householdId: id,
          companyId: household.companyId,
          baseFeeRwf: household.monthlyFeeRwf,
          totalAmountRwf: household.monthlyFeeRwf,
          dueDate,
          status: 'PENDING',
        },
      });
      chargeCreated = true;
    }

    return {
      verified: true,
      householdId: id,
      companyId: household.companyId,
      billingPeriodId: period.id,
      chargeId: charge.id,
      chargeCreated,
    };
  }
}
