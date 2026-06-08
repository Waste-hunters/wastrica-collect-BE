import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: '4ccdcdfb-f330-49d2-85f2-fda69a00a48b' })
  id: string;

  @ApiProperty({ example: '+250781234567' })
  phoneNumber: string;

  @ApiProperty({ example: 'COMPANY_ADMIN' })
  role: string;

  @ApiPropertyOptional({ example: '8107fbcb-79dd-4617-98a3-826ba08f4339' })
  companyId?: string | null;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token used as Bearer token on protected routes.',
  })
  accessToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class SendOtpResponseDto {
  @ApiProperty({ example: true })
  sent: boolean;

  @ApiProperty({
    example: 'OTP generated. SMS provider integration can deliver this code.',
  })
  message: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'Only returned outside production to help local development.',
  })
  devOtp?: string;
}
