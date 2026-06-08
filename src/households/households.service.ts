import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { ImportHouseholdsDto } from './dto/import-households.dto';
import { UpdateHouseholdFeeDto } from './dto/update-household-fee.dto';
import { UpdateHouseholdStatusDto } from './dto/update-household-status.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.household.create({
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
      },
    });
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
