import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    const existingAdmin = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.adminPhoneNumber },
    });

    if (existingAdmin) {
      throw new BadRequestException(
        'An account already exists for the admin phone number',
      );
    }

    return this.prisma.company.create({
      data: {
        name: dto.name,
        ruraLicenseNumber: dto.ruraLicenseNumber,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        lateFeeGraceDays: dto.lateFeeGraceDays,
        lateFeeType: dto.lateFeeType,
        lateFeeAmountRwf: dto.lateFeeAmountRwf,
        users: {
          create: {
            fullName: dto.adminFullName,
            phoneNumber: dto.adminPhoneNumber,
            email: dto.adminEmail,
            role: 'COMPANY_ADMIN',
            status: 'INVITED',
          },
        },
      },
      include: { users: true },
    });
  }

  async findOne(id: string, requesterCompanyId?: string | null) {
    this.assertCompanyScope(id, requesterCompanyId);

    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
    requesterCompanyId?: string | null,
  ) {
    this.assertCompanyScope(id, requesterCompanyId);

    await this.findOne(id, requesterCompanyId);

    return this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name,
        ruraLicenseNumber: dto.ruraLicenseNumber,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
      },
    });
  }

  async getSettings(id: string, requesterCompanyId?: string | null) {
    const company = await this.findOne(id, requesterCompanyId);

    return {
      companyId: company.id,
      lateFeeGraceDays: company.lateFeeGraceDays,
      lateFeeType: company.lateFeeType,
      lateFeeAmountRwf: company.lateFeeAmountRwf,
      subscriptionTier: company.subscriptionTier,
      subscriptionStatus: company.subscriptionStatus,
    };
  }

  async updateSettings(
    id: string,
    dto: UpdateCompanySettingsDto,
    requesterCompanyId?: string | null,
  ) {
    this.assertCompanyScope(id, requesterCompanyId);

    await this.findOne(id, requesterCompanyId);

    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  async getDashboard(id: string, requesterCompanyId?: string | null) {
    this.assertCompanyScope(id, requesterCompanyId);

    await this.findOne(id, requesterCompanyId);

    const [activeUsers, collectors] = await Promise.all([
      this.prisma.user.count({
        where: { companyId: id, status: 'ACTIVE' },
      }),
      this.prisma.user.count({
        where: { companyId: id, role: 'COLLECTOR' },
      }),
    ]);

    return {
      companyId: id,
      totalHouseholds: 0,
      activeUsers,
      collectors,
      note: 'Billing, households, and payments modules pending.',
    };
  }

  private assertCompanyScope(
    companyId: string,
    requesterCompanyId?: string | null,
  ) {
    if (requesterCompanyId && requesterCompanyId !== companyId) {
      throw new ForbiddenException('Cannot access another company workspace');
    }
  }
}
