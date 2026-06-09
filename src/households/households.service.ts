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
}
