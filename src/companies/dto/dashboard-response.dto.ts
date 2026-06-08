import { ApiProperty } from '@nestjs/swagger';

export class CompanyDashboardResponseDto {
  @ApiProperty({ example: '8107fbcb-79dd-4617-98a3-826ba08f4339' })
  companyId: string;

  @ApiProperty({ example: 0 })
  totalHouseholds: number;

  @ApiProperty({ example: 0 })
  activeUsers: number;

  @ApiProperty({ example: 0 })
  collectors: number;

  @ApiProperty({ example: 'Billing, households, and payments modules pending.' })
  note: string;
}
