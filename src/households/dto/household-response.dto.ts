import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HouseholdResponseDto {
  @ApiProperty({ example: '948e7f7b-ec30-47bb-81ce-f78d620dd4d1' })
  id: string;

  @ApiProperty({ example: 'KGL-00142' })
  householdCode: string;

  @ApiProperty({ example: 'Esperance Mukamana' })
  residentName: string;

  @ApiProperty({ example: '+250788111222' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: '+250788111222' })
  momoNumber?: string | null;

  @ApiProperty({ example: 'Gisozi' })
  sector: string;

  @ApiProperty({ example: 'Musezero' })
  cell: string;

  @ApiProperty({ example: 2500 })
  monthlyFeeRwf: number;

  @ApiProperty({ example: 5 })
  collectionDay: number;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;
}
