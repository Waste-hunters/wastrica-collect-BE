import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { CompaniesService } from './companies.service';
import { CompanyDashboardResponseDto } from './dto/dashboard-response.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a waste collection company',
    description:
      'Creates a company workspace and an invited COMPANY_ADMIN user. The admin then verifies by OTP through the Auth module.',
  })
  @ApiCreatedResponse({ type: CompanyResponseDto })
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get company profile' })
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiForbiddenResponse({ description: 'Users cannot access another company.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update company profile' })
  @ApiOkResponse({ type: CompanyResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companiesService.update(id, dto, user.companyId);
  }

  @Get(':id/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get company settings' })
  getSettings(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.getSettings(id, user.companyId);
  }

  @Patch(':id/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update company operational settings',
    description:
      'Currently includes late-fee defaults. Reminder, billing, and subscription settings can plug into this module later.',
  })
  updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateCompanySettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companiesService.updateSettings(id, dto, user.companyId);
  }

  @Get(':id/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get initial company dashboard summary',
    description:
      'Returns workspace counts available from the first modules. Household/payment metrics will be added when those modules exist.',
  })
  @ApiOkResponse({ type: CompanyDashboardResponseDto })
  getDashboard(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companiesService.getDashboard(id, user.companyId);
  }
}
