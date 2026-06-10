import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignHouseholdsDto } from './dto/assign-households.dto';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, requesterCompanyId?: string | null) {
    this.assertCompanyScope(companyId, requesterCompanyId);

    return this.prisma.route.findMany({
      where: { companyId },
      include: { collector: true, households: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    companyId: string,
    dto: CreateRouteDto,
    requesterCompanyId?: string | null,
  ) {
    this.assertCompanyScope(companyId, requesterCompanyId);
    await this.validateCollector(companyId, dto.collectorId);

    return this.prisma.route.create({
      data: {
        companyId,
        name: dto.name,
        sector: dto.sector,
        cell: dto.cell,
        village: dto.village,
        description: dto.description,
        collectionDay: dto.collectionDay,
        collectorId: dto.collectorId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findOne(id: string, requesterCompanyId?: string | null) {
    const zone = await this.prisma.route.findUnique({
      where: { id },
      include: { collector: true, households: true },
    });

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    this.assertCompanyScope(zone.companyId, requesterCompanyId);
    return zone;
  }

  async update(id: string, dto: UpdateRouteDto, requesterCompanyId?: string | null) {
    const zone = await this.findOne(id, requesterCompanyId);
    await this.validateCollector(zone.companyId, dto.collectorId);

    return this.prisma.route.update({
      where: { id },
      data: {
        name: dto.name,
        sector: dto.sector,
        cell: dto.cell,
        village: dto.village,
        description: dto.description,
        collectionDay: dto.collectionDay,
        collectorId: dto.collectorId,
        isActive: dto.isActive,
      },
    });
  }

  async deactivate(id: string, requesterCompanyId?: string | null) {
    await this.findOne(id, requesterCompanyId);

    return this.prisma.route.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async assignAddresses(
    zoneId: string,
    dto: AssignHouseholdsDto,
    requesterCompanyId?: string | null,
  ) {
    const zone = await this.findOne(zoneId, requesterCompanyId);

    const addresses = await this.prisma.household.findMany({
      where: { id: { in: dto.householdIds } },
    });

    if (addresses.length !== dto.householdIds.length) {
      throw new BadRequestException('One or more addresses do not exist');
    }

    const outsideCompany = addresses.find(
      (address) => address.companyId !== zone.companyId,
    );

    if (outsideCompany) {
      throw new BadRequestException('All addresses must belong to this company');
    }

    await this.prisma.household.updateMany({
      where: { id: { in: dto.householdIds } },
      data: {
        routeId: zoneId,
        collectorId: zone.collectorId,
      },
    });

    return this.findOne(zoneId, requesterCompanyId);
  }

  async removeAddress(
    zoneId: string,
    addressId: string,
    requesterCompanyId?: string | null,
  ) {
    const zone = await this.findOne(zoneId, requesterCompanyId);
    const address = await this.prisma.household.findUnique({
      where: { id: addressId },
    });

    if (!address || address.companyId !== zone.companyId) {
      throw new NotFoundException('Address not found');
    }

    return this.prisma.household.update({
      where: { id: addressId },
      data: { routeId: null },
    });
  }

  async collectorZone(
    collectorId: string,
    requester: { sub: string; role: string; companyId?: string | null },
  ) {
    if (requester.role === 'COLLECTOR' && requester.sub !== collectorId) {
      throw new ForbiddenException('Collectors can only access their own zone');
    }

    const collector = await this.prisma.user.findUnique({
      where: { id: collectorId },
    });

    if (!collector || collector.role !== 'COLLECTOR') {
      throw new NotFoundException('Collector not found');
    }

    this.assertCompanyScope(collector.companyId, requester.companyId);

    const zones = await this.prisma.route.findMany({
      where: { collectorId },
      include: { households: true },
      orderBy: { name: 'asc' },
    });

    return {
      collectorId,
      zones: zones.map((zone) => ({
        zoneId: zone.id,
        zoneName: zone.name,
        sector: zone.sector,
        cell: zone.cell,
        isActive: zone.isActive,
        addresses: zone.households.map((h) => ({
          addressId: h.id,
          addressCode: h.householdCode,
          residentName: h.residentName,
          sector: h.sector,
          cell: h.cell,
          village: h.village,
          address: h.address,
          status: h.status,
          monthlyFeeRwf: h.monthlyFeeRwf,
        })),
      })),
    };
  }

  private async validateCollector(companyId: string, collectorId?: string) {
    if (!collectorId) {
      return;
    }

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

  private assertCompanyScope(
    targetCompanyId?: string | null,
    requesterCompanyId?: string | null,
  ) {
    if (!targetCompanyId || targetCompanyId !== requesterCompanyId) {
      throw new ForbiddenException('Cannot access another company workspace');
    }
  }
}
