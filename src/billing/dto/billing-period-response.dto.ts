import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BillingPeriodResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() companyId: string;
  @ApiProperty() year: number;
  @ApiProperty() month: number;
  @ApiProperty() periodStart: Date;
  @ApiProperty() periodEnd: Date;
  @ApiProperty({ enum: ['OPEN', 'ACTIVE', 'CLOSED'] }) status: string;
  @ApiPropertyOptional() chargesGeneratedAt: Date | null;
  @ApiProperty() createdAt: Date;
}

export class BillingPeriodDetailResponseDto extends BillingPeriodResponseDto {
  @ApiProperty() totalHouseholds: number;
  @ApiProperty() totalExpectedRwf: number;
  @ApiProperty() totalCollectedRwf: number;
  @ApiProperty({ description: 'Collection rate as a percentage 0–100' })
  collectionRatePercent: number;
  @ApiProperty() paidCount: number;
  @ApiProperty() pendingCount: number;
  @ApiProperty() overdueCount: number;
}
