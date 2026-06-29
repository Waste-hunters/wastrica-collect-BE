import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentMethod, PaymentProofStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ApprovePaymentProofDto } from './dto/approve-payment-proof.dto';
import { InitiateMomoDto } from './dto/initiate-momo.dto';
import { MomoWebhookDto } from './dto/momo-webhook.dto';
import { PaymentProofResponseDto } from './dto/payment-proof-response.dto';
import {
  PaymentResponseDto,
  RecordPaymentResultDto,
} from './dto/payment-response.dto';
import { RecordCashPaymentDto } from './dto/record-cash-payment.dto';
import { RejectPaymentProofDto } from './dto/reject-payment-proof.dto';
import { ReversePaymentDto } from './dto/reverse-payment.dto';
import { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';
import { PaymentsService } from './payments.service';
import { WebhookGuard } from './webhook.guard';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── Provider webhooks (public, secret-verified) ──────────────────────────

  @Post('payments/momo/webhook')
  @UseGuards(WebhookGuard)
  @ApiOperation({
    summary: 'MTN MoMo payment callback',
    description:
      'Auto-detects and records a successful MTN MoMo payment. Idempotent on transactionId. ' +
      'Verified with the x-webhook-secret header (MOMO_WEBHOOK_SECRET).',
  })
  momoWebhook(@Body() payload: MomoWebhookDto) {
    return this.paymentsService.handleProviderWebhook(payload, PaymentMethod.MOMO_MTN);
  }

  @Post('payments/airtel/webhook')
  @UseGuards(WebhookGuard)
  @ApiOperation({
    summary: 'Airtel Money payment callback',
    description: 'Auto-detects and records a successful Airtel Money payment. Idempotent on transactionId.',
  })
  airtelWebhook(@Body() payload: MomoWebhookDto) {
    return this.paymentsService.handleProviderWebhook(payload, PaymentMethod.MOMO_AIRTEL);
  }

  // ─── MTN MoMo RequestToPay (initiate + confirm) ───────────────────────────

  @Post('households/:id/payments/momo/initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR', 'HOUSEHOLD')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start an MTN MoMo payment (RequestToPay)',
    description:
      'Sends a payment prompt to the payer\'s phone for the outstanding amount of the given ' +
      'billing period. Returns a referenceId — poll the status endpoint to confirm and settle.',
  })
  initiateMomo(
    @Param('id') householdId: string,
    @Body() dto: InitiateMomoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.initiateMomoCollection(householdId, dto, user);
  }

  @Get('payments/momo/:referenceId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR', 'HOUSEHOLD')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check an MTN MoMo payment status and settle if successful',
    description:
      'Queries MTN for the RequestToPay status. If SUCCESSFUL, records the payment and settles ' +
      'the charge (idempotent — calling again returns the existing payment).',
  })
  momoStatus(
    @Param('referenceId') referenceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.confirmMomoCollection(referenceId, user);
  }

  // ─── Collector / staff: record a payment ──────────────────────────────────

  @Post('households/:id/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Record a payment for a household (cash or confirmed MoMo)',
    description:
      'Records money received against the household charge for the given billing period and ' +
      'settles it (PAID / PARTIALLY_PAID). Use this for cash collected at the door or a MoMo ' +
      'payment the collector has personally confirmed.',
  })
  @ApiCreatedResponse({ type: RecordPaymentResultDto })
  recordCash(
    @Param('id') householdId: string,
    @Body() dto: RecordCashPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.recordCashPayment(householdId, dto, user);
  }

  @Get('households/:id/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR', 'HOUSEHOLD')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payment history for a household' })
  @ApiOkResponse({ type: PaymentResponseDto, isArray: true })
  listHouseholdPayments(
    @Param('id') householdId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.listHouseholdPayments(householdId, user);
  }

  // ─── Household: submit proof of payment (needs approval) ───────────────────

  @Post('households/:id/payment-proofs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOUSEHOLD', 'COMPANY_ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit a proof of payment for review',
    description:
      'Lets a household resident upload evidence that they paid (MoMo reference / screenshot). ' +
      'This creates a PENDING claim only — it does NOT mark the charge as paid until a ' +
      'collector or manager approves it.',
  })
  @ApiCreatedResponse({ type: PaymentProofResponseDto })
  submitProof(
    @Param('id') householdId: string,
    @Body() dto: SubmitPaymentProofDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.submitProof(householdId, dto, user);
  }

  @Get('companies/:companyId/payment-proofs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List submitted payment proofs (optionally filter by status)' })
  @ApiQuery({ name: 'status', enum: PaymentProofStatus, required: false })
  @ApiOkResponse({ type: PaymentProofResponseDto, isArray: true })
  listProofs(
    @Param('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: PaymentProofStatus,
  ) {
    return this.paymentsService.listProofs(companyId, status, user);
  }

  @Post('payment-proofs/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve a payment proof',
    description: 'Creates the actual payment and settles the charge. The proof is marked APPROVED.',
  })
  @ApiCreatedResponse({ type: RecordPaymentResultDto })
  approveProof(
    @Param('id') id: string,
    @Body() dto: ApprovePaymentProofDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.approveProof(id, dto, user);
  }

  @Post('payment-proofs/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a payment proof with a reason' })
  @ApiOkResponse({ type: PaymentProofResponseDto })
  rejectProof(
    @Param('id') id: string,
    @Body() dto: RejectPaymentProofDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.rejectProof(id, dto, user);
  }

  // ─── Payment detail & reversal ────────────────────────────────────────────

  @Get('payments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR', 'HOUSEHOLD')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single payment' })
  @ApiOkResponse({ type: PaymentResponseDto })
  getPayment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.getPayment(id, user);
  }

  @Post('payments/:id/reverse')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPANY_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reverse a payment',
    description:
      'Marks a payment as reversed (with a mandatory reason) and undoes its effect on the charge. ' +
      'The payment record itself is never deleted (audit-safe).',
  })
  @ApiOkResponse({ type: PaymentResponseDto })
  reverse(
    @Param('id') id: string,
    @Body() dto: ReversePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.reversePayment(id, dto, user);
  }
}
