import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateHouseholdFeeDto {
  @ApiProperty({ example: 3000, minimum: 0 })
  @IsInt()
  @Min(0)
  monthlyFeeRwf: number;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ example: 'RURA tariff update for Gisozi sector.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
