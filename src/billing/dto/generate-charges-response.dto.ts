import { ApiProperty } from '@nestjs/swagger';

export class GenerateChargesResponseDto {
  @ApiProperty() billingPeriodId: string;
  @ApiProperty() chargesCreated: number;
  @ApiProperty({ description: 'Charges already existing (idempotent re-call)' })
  skipped: number;
  @ApiProperty({ description: 'Sum of all base fees for this period in RWF' })
  totalExpectedRwf: number;
}
