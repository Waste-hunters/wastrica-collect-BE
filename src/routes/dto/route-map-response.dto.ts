import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RouteMapHouseholdDto {
  @ApiProperty({ example: '948e7f7b-ec30-47bb-81ce-f78d620dd4d1' })
  householdId: string;

  @ApiProperty({ example: 'KGL-00142' })
  householdCode: string;

  @ApiProperty({ example: 'Esperance Mukamana' })
  residentName: string;

  @ApiProperty({ example: 'ACTIVE' })
  householdStatus: string;

  @ApiProperty({ example: 'UNKNOWN_UNTIL_PAYMENTS_MODULE' })
  paymentStatus: string;

  @ApiProperty({ example: 'grey' })
  pinColor: string;

  @ApiProperty({ example: 'Gisozi' })
  sector: string;

  @ApiProperty({ example: 'Musezero' })
  cell: string;

  @ApiPropertyOptional({ example: -1.9253 })
  latitude?: number | null;

  @ApiPropertyOptional({ example: 30.1035 })
  longitude?: number | null;

  @ApiProperty({ example: 2500 })
  amountDueRwf: number;
}

export class RouteMapResponseDto {
  @ApiProperty({ example: 'f93c96d5-ea4e-4f81-a6a8-451a929d4b16' })
  routeId: string;

  @ApiProperty({ example: 'Remera Tuesday Route' })
  routeName: string;

  @ApiProperty({ type: RouteMapHouseholdDto, isArray: true })
  households: RouteMapHouseholdDto[];
}
