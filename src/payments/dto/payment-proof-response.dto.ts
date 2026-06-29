import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentProofResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() companyId: string;
  @ApiProperty() householdId: string;
  @ApiPropertyOptional({ nullable: true }) chargeId: string | null;
  @ApiPropertyOptional({ nullable: true }) billingPeriodId: string | null;
  @ApiProperty() claimedAmountRwf: number;
  @ApiProperty({ example: 'MOMO_MTN' }) paymentMethod: string;
  @ApiPropertyOptional({ nullable: true }) momoTransactionId: string | null;
  @ApiPropertyOptional({ nullable: true }) proofImageUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) note: string | null;
  @ApiProperty({ example: 'PENDING', description: 'PENDING | APPROVED | REJECTED' })
  status: string;
  @ApiPropertyOptional({ nullable: true }) reviewedById: string | null;
  @ApiPropertyOptional({ nullable: true }) reviewedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) rejectionReason: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Payment created when this proof was approved' })
  paymentId: string | null;
  @ApiProperty() createdAt: Date;
}
