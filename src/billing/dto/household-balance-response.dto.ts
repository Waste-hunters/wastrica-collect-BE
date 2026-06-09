import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HouseholdBalanceResponseDto {
  @ApiProperty() householdId: string;
  @ApiProperty() householdCode: string;
  @ApiProperty() residentName: string;
  @ApiProperty({ description: 'Total unpaid balance across all open periods in RWF' })
  totalOutstandingRwf: number;
  @ApiProperty({ description: 'Portion of outstanding that is overdue in RWF' })
  overdueAmountRwf: number;
  @ApiProperty({ description: 'Number of billing periods with an open charge' })
  openChargesCount: number;
  @ApiPropertyOptional({ description: 'Start date of the oldest unpaid billing period' })
  oldestUnpaidPeriodStart: Date | null;
}
