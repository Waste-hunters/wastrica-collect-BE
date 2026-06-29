import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdLoginDto } from './dto/household-login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const OTP_TTL_MINUTES = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('No user found with this email address');
    }

    const otp = this.generateOtp();
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.emailOtpChallenge.create({
      data: { email: dto.email, codeHash, expiresAt },
    });

    await this.emailService.sendStaffOtp(dto.email, otp, user.fullName);

    return {
      sent: true,
      message: 'OTP sent via email.',
      provider: 'email',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const challenge = await this.prisma.emailOtpChallenge.findFirst({
      where: {
        email: dto.email,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new UnauthorizedException('OTP is invalid or expired');
    }

    const isMatch = await bcrypt.compare(dto.code, challenge.codeHash);
    if (!isMatch) {
      throw new UnauthorizedException('OTP is invalid or expired');
    }

    await this.prisma.emailOtpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('No user found for this email');
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
        email: activatedUser.email,
        phoneNumber: activatedUser.phoneNumber,
        role: activatedUser.role,
        companyId: activatedUser.companyId,
      },
    };
  }

  async householdLogin(dto: HouseholdLoginDto) {
    const household = await this.prisma.household.findUnique({
      where: { email: dto.email },
    });

    if (!household) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.prisma.user.findFirst({
      where: { householdId: household.id, role: 'HOUSEHOLD' },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Account not activated yet');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      companyId: user.companyId,
      householdId: household.id,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        householdId: household.id,
      },
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
