import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class ActivateHouseholdDto {
  @ApiProperty({ example: '483921', description: '6-digit OTP sent to the household email' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password the resident wants to set (min 8 chars)' })
  @IsString()
  @MinLength(8)
  password: string;
}
