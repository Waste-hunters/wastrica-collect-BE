import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { BillingService } from './billing.service';
import { BillingPeriodDetailResponseDto, BillingPeriodResponseDto } from './dto/billing-period-response.dto';
import { CreateBillingPeriodDto } from './dto/create-billing-period.dto';
import { GenerateChargesResponseDto } from './dto/generate-charges-response.dto';
import { HouseholdBalanceResponseDto } from './dto/household-balance-response.dto';
import { HouseholdPaymentStatusResponseDto } from './dto/household-payment-status-response.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Billing period endpoints ─────────────────────────────────────────────

  @Get('companies/:companyId/billing-periods')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiTags('Billing')
  @ApiOperation({ summary: 'List all billing periods for a company' })
  @ApiOkResponse({ type: BillingPeriodResponseDto, isArray: true })
  listBillingPeriods(
    @Param('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.listBillingPeriods(companyId, user.companyId);
  }

  @Post('companies/:companyId/billing-periods')
  @Roles('COMPANY_ADMIN')
  @ApiTags('Billing')
  @ApiOperation({
    summary: 'Create a monthly billing period',
    description: 'Opens a new billing period for the given year and month. Charges are not yet generated — call generate-charges to create individual household charges.',
  })
  @ApiCreatedResponse({ type: BillingPeriodResponseDto })
  createBillingPeriod(
    @Param('companyId') companyId: string,
    @Body() dto: CreateBillingPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.createBillingPeriod(companyId, dto, user.companyId);
  }

  @Get('billing-periods/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiTags('Billing')
  @ApiOperation({
    summary: 'Get a billing period with charge summary statistics',
    description: 'Returns the billing period plus aggregated stats: total expected, collected, collection rate, and per-status counts.',
  })
  @ApiOkResponse({ type: BillingPeriodDetailResponseDto })
  getBillingPeriod(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.getBillingPeriod(id, user.companyId);
  }

  @Post('billing-periods/:id/generate-charges')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiTags('Billing')
  @ApiOperation({
    summary: 'Generate charges for all active households',
    description:
      'Creates one Charge record per active household in this billing period using the household\'s current monthly fee. ' +
      'Idempotent: calling again on an already-active period returns the existing charge count without duplicating.',
  })
  @ApiCreatedResponse({ type: GenerateChargesResponseDto })
  generateCharges(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.generateCharges(id, user.companyId);
  }

  // ─── Household billing endpoints ──────────────────────────────────────────

  @Get('households/:id/balance')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR', 'HOUSEHOLD')
  @ApiTags('Billing — Households')
  @ApiOperation({
    summary: 'Get outstanding balance for a household',
    description: 'Sums all unpaid charges (PENDING, OVERDUE, PARTIALLY_PAID) across all billing periods.',
  })
  @ApiOkResponse({ type: HouseholdBalanceResponseDto })
  getHouseholdBalance(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.getHouseholdBalance(id, user.companyId);
  }

  @Get('households/:id/payment-status')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR', 'HOUSEHOLD')
  @ApiTags('Billing — Households')
  @ApiOperation({
    summary: 'Get payment status for the current billing period',
    description:
      'Returns the charge status for the most recent active billing period. ' +
      'Status is one of: PENDING, PAID, PARTIALLY_PAID, OVERDUE, WAIVED, NO_CHARGE, NO_PERIOD.',
  })
  @ApiOkResponse({ type: HouseholdPaymentStatusResponseDto })
  getHouseholdPaymentStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.getHouseholdPaymentStatus(id, user.companyId);
  }
}
