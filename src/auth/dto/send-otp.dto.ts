import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: 'collector@example.com',
    description: 'Email address that will receive the one-time password.',
  })
  @IsEmail()
  email: string;
}
