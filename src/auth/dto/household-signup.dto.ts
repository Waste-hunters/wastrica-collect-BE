import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class HouseholdSignupDto {
  @ApiProperty({ example: 'Marie Uwase' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '0788123456' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: 'marie.uwase@example.rw', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
