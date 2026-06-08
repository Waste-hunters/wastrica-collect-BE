import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export enum LateFeeTypeDto {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE',
}

export class CreateCompanyDto {
  @ApiProperty({ example: 'COPED Group Rwanda' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'RURA-WASTE-2026-001' })
  @IsOptional()
  @IsString()
  ruraLicenseNumber?: string;

  @ApiProperty({ example: '+250788123456' })
  @IsPhoneNumber()
  contactPhone: string;

  @ApiPropertyOptional({ example: 'ops@copedgroup.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ example: 'Claudine Uwimana' })
  @IsString()
  @MinLength(2)
  adminFullName: string;

  @ApiProperty({ example: '+250781234567' })
  @IsPhoneNumber()
  adminPhoneNumber: string;

  @ApiPropertyOptional({ example: 'claudine@copedgroup.com' })
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @ApiPropertyOptional({ example: 10, minimum: 0, maximum: 31 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(31)
  lateFeeGraceDays?: number;

  @ApiPropertyOptional({ enum: LateFeeTypeDto, example: LateFeeTypeDto.FLAT })
  @IsOptional()
  @IsEnum(LateFeeTypeDto)
  lateFeeType?: LateFeeTypeDto;

  @ApiPropertyOptional({ example: 500, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateFeeAmountRwf?: number;
}
