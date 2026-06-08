import { ApiProperty } from '@nestjs/swagger';

export class CollectorPerformanceDto {
  @ApiProperty({ example: '4ccdcdfb-f330-49d2-85f2-fda69a00a48b' })
  collectorId: string;

  @ApiProperty({ example: 2 })
  assignedRoutes: number;

  @ApiProperty({ example: 180 })
  assignedHouseholds: number;

  @ApiProperty({ example: 0 })
  paidHouseholds: number;

  @ApiProperty({ example: 0 })
  unpaidHouseholds: number;

  @ApiProperty({ example: 'Payment module pending; payment counts are placeholders.' })
  note: string;
}
