import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({ example: 'Remera Tuesday Route' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'Remera' })
  @IsString()
  sector!: string;

  @ApiPropertyOptional({ example: 'Rukiri II' })
  @IsOptional()
  @IsString()
  cell?: string;

  @ApiPropertyOptional({ example: 'Kagugu' })
  @IsOptional()
  @IsString()
  village?: string;

  @ApiPropertyOptional({ example: 'Main route for households near KG 17 Ave.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 9, minimum: 1, maximum: 31 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  collectionDay?: number;

  @ApiPropertyOptional({ example: '4ccdcdfb-f330-49d2-85f2-fda69a00a48b' })
  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
