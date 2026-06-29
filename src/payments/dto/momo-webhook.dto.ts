import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

/**
 * Shared shape for MTN MoMo and Airtel Money payment callbacks.
 * Matches the SRS §9.3 webhook payload. Providers differ slightly in field
 * names; the controller normalises both into this DTO before processing.
 */
export class MomoWebhookDto {
  @ApiProperty({ example: 'MTN-TXN-123456', description: 'Unique provider transaction id' })
  @IsString()
  transactionId: string;

  @ApiProperty({ example: '0781234567', description: 'Phone number that paid (the household)' })
  @IsString()
  payerPhone: string;

  @ApiPropertyOptional({ example: '0789876543', description: 'Company / collector receiving number' })
  @IsOptional()
  @IsString()
  payeePhone?: string;

  @ApiProperty({ example: 2000, description: 'Amount paid in RWF' })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'RWF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'SUCCESSFUL', enum: ['SUCCESSFUL', 'FAILED', 'PENDING'] })
  @IsIn(['SUCCESSFUL', 'FAILED', 'PENDING'])
  status: string;

  @ApiPropertyOptional({ example: '2026-06-01T14:32:00Z' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}
