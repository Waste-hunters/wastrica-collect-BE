import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CurrentPeriodDto {
  @ApiProperty() id: string;
  @ApiProperty() year: number;
  @ApiProperty() month: number;
  @ApiProperty() periodStart: Date;
  @ApiProperty() periodEnd: Date;
}

export class HouseholdPaymentStatusResponseDto {
  @ApiProperty() householdId: string;
  @ApiProperty() residentName: string;
  @ApiPropertyOptional({ type: CurrentPeriodDto })
  currentPeriod: CurrentPeriodDto | null;
  @ApiProperty({
    description:
      'PENDING | PAID | PARTIALLY_PAID | OVERDUE | WAIVED | NO_CHARGE | NO_PERIOD',
  })
  status: string;
  @ApiProperty({ description: 'Total amount due for the current period in RWF' })
  amountDueRwf: number;
  @ApiProperty({ description: 'Amount already paid for the current period in RWF' })
  amountPaidRwf: number;
  @ApiProperty({ description: 'Remaining balance for the current period in RWF' })
  remainingBalanceRwf: number;
  @ApiPropertyOptional({ description: 'Due date for the current period charge' })
  dueDate: Date | null;
  @ApiProperty() isOverdue: boolean;
}
