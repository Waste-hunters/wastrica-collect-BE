import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class ApprovePaymentProofDto {
  @ApiPropertyOptional({
    description:
      'Optional override of the amount to record. Defaults to the amount the resident claimed. ' +
      'Use this when the collector confirms a different figure.',
    example: 3000,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  amountRwf?: number;
}
