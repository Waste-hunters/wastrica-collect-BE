import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export enum UserRoleDto {
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  MANAGER = 'MANAGER',
  COLLECTOR = 'COLLECTOR',
}

export class CreateUserDto {
  @ApiProperty({ example: 'Jean Ndayisenga' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: '+250781234567' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'jean@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: UserRoleDto, example: UserRoleDto.COLLECTOR })
  @IsEnum(UserRoleDto)
  role: UserRoleDto;
}
