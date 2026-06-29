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

export enum CashPaymentMethod {
  CASH = 'CASH',
  MOMO_MTN = 'MOMO_MTN',
  MOMO_AIRTEL = 'MOMO_AIRTEL',
  EKASH = 'EKASH',
  OTHER = 'OTHER',
}

export class RecordCashPaymentDto {
  @ApiProperty({ example: 2026, description: 'Year of the billing period being settled' })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 6, description: 'Month (1-12) of the billing period being settled' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 3000, description: 'Amount received in RWF (whole numbers only)' })
  @IsInt()
  @IsPositive()
  amountRwf: number;

  @ApiPropertyOptional({
    enum: CashPaymentMethod,
    default: CashPaymentMethod.CASH,
    description: 'How the household paid. Defaults to CASH for collector-recorded payments.',
  })
  @IsOptional()
  @IsEnum(CashPaymentMethod)
  paymentMethod?: CashPaymentMethod;

  @ApiPropertyOptional({
    description: 'Provider transaction reference, if the collector logged a MoMo payment manually.',
  })
  @IsOptional()
  @IsString()
  momoTransactionId?: string;

  @ApiPropertyOptional({ description: 'Optional free-text note for the audit trail.' })
  @IsOptional()
  @IsString()
  note?: string;
}
