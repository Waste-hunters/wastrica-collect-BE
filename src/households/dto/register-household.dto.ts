import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class RegisterHouseholdDto {
  @ApiProperty({ example: '8583fb97-8c31-4cbb-bd7a-0d9c4c7c88b0' })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'Gisozi' })
  @IsString()
  @IsNotEmpty()
  sector: string;

  @ApiProperty({ example: 'Musezero' })
  @IsString()
  @IsNotEmpty()
  cell: string;

  @ApiPropertyOptional({ example: 'Kagara' })
  @IsOptional()
  @IsString()
  village?: string;

  @ApiPropertyOptional({ example: 'KG 12 Ave, House 21' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '0788111222' })
  @IsOptional()
  @IsString()
  momoNumber?: string;

  @ApiProperty({ example: 3500, minimum: 0 })
  @IsInt()
  @Min(0)
  monthlyFeeRwf: number;

  @ApiProperty({ example: 15, minimum: 1, maximum: 31 })
  @IsInt()
  @Min(1)
  @Max(31)
  collectionDay: number;
}
