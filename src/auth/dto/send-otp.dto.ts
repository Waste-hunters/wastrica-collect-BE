import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: '+250781234567',
    description: 'Phone number that will receive the one-time password.',
  })
  @IsPhoneNumber()
  phoneNumber: string;
}
