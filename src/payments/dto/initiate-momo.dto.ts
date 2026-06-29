import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class InitiateMomoDto {
  @ApiProperty({ example: 2026, description: 'Year of the billing period to collect' })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 6, description: 'Month (1-12) of the billing period to collect' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({
    description:
      'Phone number to charge. Defaults to the household MoMo number, then its phone number.',
    example: '0781234567',
  })
  @IsOptional()
  @IsString()
  payerPhone?: string;
}
