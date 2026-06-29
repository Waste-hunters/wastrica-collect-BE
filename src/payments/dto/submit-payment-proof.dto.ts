import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum ProofPaymentMethod {
  MOMO_MTN = 'MOMO_MTN',
  MOMO_AIRTEL = 'MOMO_AIRTEL',
  EKASH = 'EKASH',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

/**
 * Submitted by a household resident from their portal. This NEVER settles a
 * charge on its own — it creates a PENDING claim that a collector / manager
 * must approve before any payment is recorded.
 */
export class SubmitPaymentProofDto {
  @ApiProperty({ example: 2026, description: 'Year of the billing period the proof is for' })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 6, description: 'Month (1-12) of the billing period the proof is for' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 3000, description: 'Amount the resident claims they paid, in RWF' })
  @IsInt()
  @IsPositive()
  claimedAmountRwf: number;

  @ApiProperty({ enum: ProofPaymentMethod, description: 'How the resident says they paid' })
  @IsEnum(ProofPaymentMethod)
  paymentMethod: ProofPaymentMethod;

  @ApiPropertyOptional({ description: 'MoMo transaction id / SMS reference, if available' })
  @IsOptional()
  @IsString()
  momoTransactionId?: string;

  @ApiPropertyOptional({
    description: 'URL of an uploaded screenshot proving the payment (e.g. R2/object storage URL).',
  })
  @IsOptional()
  @IsString()
  proofImageUrl?: string;

  @ApiPropertyOptional({ description: 'Optional message from the resident (e.g. pasted MoMo SMS).' })
  @IsOptional()
  @IsString()
  note?: string;
}
