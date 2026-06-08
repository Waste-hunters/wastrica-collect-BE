import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { HouseholdResponseDto } from './dto/household-response.dto';
import { ImportHouseholdsDto } from './dto/import-households.dto';
import { UpdateHouseholdFeeDto } from './dto/update-household-fee.dto';
import { UpdateHouseholdStatusDto } from './dto/update-household-status.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { HouseholdsService } from './households.service';

@ApiTags('Households')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Get('companies/:companyId/households')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List company households' })
  @ApiOkResponse({ type: HouseholdResponseDto, isArray: true })
  list(@Param('companyId') companyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.householdsService.list(companyId, user.companyId);
  }

  @Post('companies/:companyId/households')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Register a household' })
  @ApiCreatedResponse({ type: HouseholdResponseDto })
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateHouseholdDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.householdsService.create(companyId, dto, user.companyId);
  }

  @Post('companies/:companyId/households/import')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Bulk import households',
    description:
      'Accepts parsed CSV rows as JSON for now. A multipart CSV upload can later call the same service.',
  })
  import(
    @Param('companyId') companyId: string,
    @Body() dto: ImportHouseholdsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.householdsService.import(companyId, dto, user.companyId);
  }

  @Get('households/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR')
  @ApiOperation({ summary: 'Get household details' })
  @ApiOkResponse({ type: HouseholdResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.householdsService.findOne(id, user.companyId);
  }

  @Patch('households/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update household details' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHouseholdDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.householdsService.update(id, dto, user.companyId);
  }

  @Patch('households/:id/status')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update household status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateHouseholdStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.householdsService.updateStatus(id, dto, user.companyId);
  }

  @Post('households/:id/verify')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Verify household',
    description: 'Verified households can later receive reminders and be billed.',
  })
  verify(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.householdsService.verify(id, user.companyId);
  }

  @Patch('households/:id/fee')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Update household fee with effective date history',
  })
  updateFee(
    @Param('id') id: string,
    @Body() dto: UpdateHouseholdFeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.householdsService.updateFee(id, dto, user.sub, user.companyId);
  }
}
