import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanyUsers(companyId: string, requesterCompanyId?: string | null) {
    this.assertCompanyScope(companyId, requesterCompanyId);

    return this.prisma.user.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCompanyUser(
    companyId: string,
    dto: CreateUserDto,
    requesterId: string,
    requesterCompanyId?: string | null,
  ) {
    this.assertCompanyScope(companyId, requesterCompanyId);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

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
        role: dto.role,
        status: 'INVITED',
        invitedById: requesterId,
      },
    });
  }

  async findOne(id: string, requesterCompanyId?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertCompanyScope(user.companyId, requesterCompanyId);
    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    requesterCompanyId?: string | null,
  ) {
    await this.findOne(id, requesterCompanyId);

    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
      },
    });
  }

  async updateRole(
    id: string,
    dto: UpdateUserRoleDto,
    requesterCompanyId?: string | null,
  ) {
    await this.findOne(id, requesterCompanyId);

    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });
  }

  async suspend(id: string, requesterCompanyId?: string | null) {
    await this.findOne(id, requesterCompanyId);

    return this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
  }

  private assertCompanyScope(
    targetCompanyId?: string | null,
    requesterCompanyId?: string | null,
  ) {
    if (!targetCompanyId || requesterCompanyId !== targetCompanyId) {
      throw new ForbiddenException('Cannot access another company workspace');
    }
  }
}
