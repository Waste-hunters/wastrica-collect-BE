import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RouteResponseDto {
  @ApiProperty({ example: 'f93c96d5-ea4e-4f81-a6a8-451a929d4b16' })
  id: string;

  @ApiProperty({ example: 'Gisozi Zone A' })
  name: string;

  @ApiProperty({ example: 'Gisozi' })
  sector: string;

  @ApiPropertyOptional({ example: 'Musezero' })
  cell?: string | null;

  @ApiPropertyOptional({ example: 'Kagugu' })
  village?: string | null;

  @ApiPropertyOptional({ example: '4ccdcdfb-f330-49d2-85f2-fda69a00a48b' })
  collectorId?: string | null;

  @ApiPropertyOptional({ example: 9 })
  collectionDay?: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;
}
