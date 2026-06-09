import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SmsService } from '../notifications/sms.service';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    await this.smsService.sendVerification(dto.phoneNumber);

    return {
      sent: true,
      message: 'OTP sent via SMS.',
      provider: 'twilio',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const approved = await this.smsService.checkVerification(
      dto.phoneNumber,
      dto.code,
    );

    if (!approved) {
      throw new UnauthorizedException('OTP is invalid or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (!user) {
      throw new BadRequestException(
        'No invited user exists for this phone number yet',
      );
    }

    const activatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: activatedUser.id,
      phoneNumber: activatedUser.phoneNumber,
      role: activatedUser.role,
      companyId: activatedUser.companyId,
    });

    return {
      accessToken,
      user: {
        id: activatedUser.id,
        phoneNumber: activatedUser.phoneNumber,
        role: activatedUser.role,
        companyId: activatedUser.companyId,
      },
    };
  }
}
