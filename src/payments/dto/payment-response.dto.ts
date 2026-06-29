import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() companyId: string;
  @ApiProperty() householdId: string;
  @ApiPropertyOptional({ nullable: true }) chargeId: string | null;
  @ApiPropertyOptional({ nullable: true }) billingPeriodId: string | null;
  @ApiPropertyOptional({ nullable: true }) collectorId: string | null;
  @ApiProperty({ description: 'Amount recorded in RWF' }) amountRwf: number;
  @ApiProperty({ example: 'CASH' }) paymentMethod: string;
  @ApiPropertyOptional({ nullable: true }) momoTransactionId: string | null;
  @ApiProperty({ example: 'COLLECTOR', description: 'SYSTEM | COLLECTOR | HOUSEHOLD_CLAIM' })
  source: string;
  @ApiProperty() paidAt: Date;
  @ApiProperty({ description: 'Whether this payment has been reversed' }) isReversed: boolean;
  @ApiPropertyOptional({ nullable: true }) reversalReason: string | null;
  @ApiProperty() createdAt: Date;
}

export class RecordPaymentResultDto {
  @ApiProperty({ type: PaymentResponseDto }) payment: PaymentResponseDto;
  @ApiProperty({ description: 'Charge status after applying this payment' }) chargeStatus: string;
  @ApiProperty({ description: 'Remaining balance on the settled charge in RWF' })
  remainingBalanceRwf: number;
}
