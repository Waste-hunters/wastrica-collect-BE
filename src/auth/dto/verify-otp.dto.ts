import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '+250781234567' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code: string;
}
