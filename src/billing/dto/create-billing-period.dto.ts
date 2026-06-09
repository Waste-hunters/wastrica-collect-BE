import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class CreateBillingPeriodDto {
  @ApiProperty({ example: 2026, description: 'Year of the billing period' })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 6, description: 'Month number 1–12' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
