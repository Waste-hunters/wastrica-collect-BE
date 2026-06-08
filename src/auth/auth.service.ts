import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
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
    const code = this.generateOtp();
    const codeHash = await bcrypt.hash(code, 10);
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    await this.prisma.otpChallenge.create({
      data: {
        phoneNumber: dto.phoneNumber,
        codeHash,
        userId: user?.id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const smsResponse = await this.smsService.sendOtp(dto.phoneNumber, code);

    return {
      sent: true,
      message: 'OTP sent by SMS.',
      provider: 'africastalking',
      providerResponse: smsResponse,
      devOtp:
        this.configService.get('NODE_ENV') === 'production' ? undefined : code,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        phoneNumber: dto.phoneNumber,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new UnauthorizedException('OTP is invalid or expired');
    }

    const valid = await bcrypt.compare(dto.code, challenge.codeHash);

    if (!valid) {
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
        otpChallenges: {
          update: {
            where: { id: challenge.id },
            data: { consumedAt: new Date() },
          },
        },
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

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
