import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateHouseholdDto {
  @ApiPropertyOptional({
    example: 'KGL-00142',
    description:
      'Human-readable code. If omitted, the backend generates one per company.',
  })
  @IsOptional()
  @IsString()
  householdCode?: string;

  @ApiProperty({ example: 'Esperance Mukamana' })
  @IsString()
  @MinLength(2)
  residentName: string;

  @ApiProperty({ example: '+250788111222' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiPropertyOptional({ example: '+250788111222' })
  @IsOptional()
  @IsPhoneNumber()
  momoNumber?: string;

  @ApiProperty({ example: 'Gisozi' })
  @IsString()
  sector: string;

  @ApiProperty({ example: 'Musezero' })
  @IsString()
  cell: string;

  @ApiPropertyOptional({ example: 'Kagara' })
  @IsOptional()
  @IsString()
  village?: string;

  @ApiPropertyOptional({ example: 'KG 12 Ave, House 21' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: -1.9253 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 30.1035 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ example: 2500, minimum: 0 })
  @IsInt()
  @Min(0)
  monthlyFeeRwf: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 31 })
  @IsInt()
  @Min(1)
  @Max(31)
  collectionDay: number;

  @ApiPropertyOptional({ example: '4ccdcdfb-f330-49d2-85f2-fda69a00a48b' })
  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @ApiPropertyOptional({
    example: 'jean.uwimana@gmail.com',
    description: 'Household email for self-service portal access. An OTP is sent here upon registration.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'f93c96d5-ea4e-4f81-a6a8-451a929d4b16' })
  @IsOptional()
  @IsUUID()
  routeId?: string;
}
