import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { UpdateCollectorDto } from './dto/update-collector.dto';

@Injectable()
export class CollectorsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, requesterCompanyId?: string | null) {
    this.assertCompanyScope(companyId, requesterCompanyId);

    return this.prisma.user.findMany({
      where: { companyId, role: 'COLLECTOR' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    companyId: string,
    dto: CreateCollectorDto,
    requesterId: string,
    requesterCompanyId?: string | null,
  ) {
    this.assertCompanyScope(companyId, requesterCompanyId);

    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existing) {
      throw new BadRequestException('A user with this phone number exists');
    }

    return this.prisma.user.create({
      data: {
        companyId,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        role: 'COLLECTOR',
        status: 'INVITED',
        invitedById: requesterId,
      },
    });
  }

  async findOne(
    id: string,
    requester: { sub: string; role: string; companyId?: string | null },
  ) {
    const collector = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!collector || collector.role !== 'COLLECTOR') {
      throw new NotFoundException('Collector not found');
    }

    if (requester.role === 'COLLECTOR' && requester.sub !== collector.id) {
      throw new ForbiddenException('Collectors can only access their own profile');
    }

    this.assertCompanyScope(collector.companyId, requester.companyId);
    return collector;
  }

  async update(
    id: string,
    dto: UpdateCollectorDto,
    requesterCompanyId?: string | null,
  ) {
    const collector = await this.prisma.user.findUnique({ where: { id } });

    if (!collector || collector.role !== 'COLLECTOR') {
      throw new NotFoundException('Collector not found');
    }

    this.assertCompanyScope(collector.companyId, requesterCompanyId);

    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
      },
    });
  }

  async performance(
    id: string,
    requester: { sub: string; role: string; companyId?: string | null },
  ) {
    const collector = await this.findOne(id, requester);

    const [assignedRoutes, assignedHouseholds] = await Promise.all([
      this.prisma.route.count({ where: { collectorId: collector.id } }),
      this.prisma.household.count({ where: { collectorId: collector.id } }),
    ]);

    return {
      collectorId: collector.id,
      assignedRoutes,
      assignedHouseholds,
      paidHouseholds: 0,
      unpaidHouseholds: 0,
      note: 'Payment module pending; payment counts are placeholders.',
    };
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
