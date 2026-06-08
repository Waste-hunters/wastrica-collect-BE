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
        description: dto.description,
        collectionDay: dto.collectionDay,
        collectorId: dto.collectorId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findOne(id: string, requesterCompanyId?: string | null) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: { collector: true, households: true },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    this.assertCompanyScope(route.companyId, requesterCompanyId);
    return route;
  }

  async update(id: string, dto: UpdateRouteDto, requesterCompanyId?: string | null) {
    const route = await this.findOne(id, requesterCompanyId);
    await this.validateCollector(route.companyId, dto.collectorId);

    return this.prisma.route.update({
      where: { id },
      data: {
        name: dto.name,
        sector: dto.sector,
        cell: dto.cell,
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

  async assignHouseholds(
    routeId: string,
    dto: AssignHouseholdsDto,
    requesterCompanyId?: string | null,
  ) {
    const route = await this.findOne(routeId, requesterCompanyId);

    const households = await this.prisma.household.findMany({
      where: { id: { in: dto.householdIds } },
    });

    if (households.length !== dto.householdIds.length) {
      throw new BadRequestException('One or more households do not exist');
    }

    const outsideCompany = households.find(
      (household) => household.companyId !== route.companyId,
    );

    if (outsideCompany) {
      throw new BadRequestException('All households must belong to this company');
    }

    await this.prisma.household.updateMany({
      where: { id: { in: dto.householdIds } },
      data: {
        routeId,
        collectorId: route.collectorId,
      },
    });

    return this.findOne(routeId, requesterCompanyId);
  }

  async removeHousehold(
    routeId: string,
    householdId: string,
    requesterCompanyId?: string | null,
  ) {
    const route = await this.findOne(routeId, requesterCompanyId);
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
    });

    if (!household || household.companyId !== route.companyId) {
      throw new NotFoundException('Household not found');
    }

    return this.prisma.household.update({
      where: { id: householdId },
      data: { routeId: null },
    });
  }

  async map(routeId: string, requesterCompanyId?: string | null) {
    const route = await this.findOne(routeId, requesterCompanyId);

    return {
      routeId: route.id,
      routeName: route.name,
      households: route.households.map((household) => this.toMapPin(household)),
    };
  }

  async optimized(routeId: string, requesterCompanyId?: string | null) {
    const map = await this.map(routeId, requesterCompanyId);

    return {
      ...map,
      households: [...map.households].sort((a, b) => {
        const rank = { ACTIVE: 1, RELOCATED: 2, DECEASED: 3, SUSPENDED: 4 };
        return (rank[a.householdStatus] ?? 9) - (rank[b.householdStatus] ?? 9);
      }),
      note: 'Payment-aware optimization will be added after the payments module.',
    };
  }

  async collectorRoute(
    collectorId: string,
    requester: { sub: string; role: string; companyId?: string | null },
  ) {
    if (requester.role === 'COLLECTOR' && requester.sub !== collectorId) {
      throw new ForbiddenException('Collectors can only access their own route');
    }

    const collector = await this.prisma.user.findUnique({
      where: { id: collectorId },
    });

    if (!collector || collector.role !== 'COLLECTOR') {
      throw new NotFoundException('Collector not found');
    }

    this.assertCompanyScope(collector.companyId, requester.companyId);

    const routes = await this.prisma.route.findMany({
      where: { collectorId },
      include: { households: true },
      orderBy: { name: 'asc' },
    });

    return {
      collectorId,
      routes: routes.map((route) => ({
        routeId: route.id,
        routeName: route.name,
        households: route.households.map((household) => this.toMapPin(household)),
      })),
    };
  }

  private toMapPin(household) {
    return {
      householdId: household.id,
      householdCode: household.householdCode,
      residentName: household.residentName,
      householdStatus: household.status,
      paymentStatus: 'UNKNOWN_UNTIL_PAYMENTS_MODULE',
      pinColor: this.pinColorForHouseholdStatus(household.status),
      sector: household.sector,
      cell: household.cell,
      latitude: household.latitude === null ? null : Number(household.latitude),
      longitude: household.longitude === null ? null : Number(household.longitude),
      amountDueRwf: household.monthlyFeeRwf,
    };
  }

  private pinColorForHouseholdStatus(status: string) {
    if (status === 'SUSPENDED') {
      return 'grey';
    }

    return 'blue';
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
