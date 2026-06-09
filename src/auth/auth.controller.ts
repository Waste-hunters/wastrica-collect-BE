import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthResponseDto, SendOtpResponseDto } from './dto/auth-response.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  @ApiOperation({
    summary: 'Send OTP',
    description:
      'Sends a one-time passcode to the given phone number via Twilio Verify SMS.',
  })
  @ApiBody({ type: SendOtpDto })
  @ApiOkResponse({ type: SendOtpResponseDto })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('otp/verify')
  @ApiOperation({
    summary: 'Verify OTP and receive JWT',
    description:
      'Verifies the OTP for an invited user and returns a JWT scoped to their role and company.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'OTP is invalid or expired.' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated JWT identity' })
  me(@CurrentUser() user) {
    return user;
  }
}
