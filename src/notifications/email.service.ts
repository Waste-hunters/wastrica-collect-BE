import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT') ?? 587;
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASS');
    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM') ?? `Wastrica Collect <${user}>`;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn(
        'EmailService: EMAIL_HOST / EMAIL_USER / EMAIL_PASS not set — emails will not be sent.',
      );
    }
  }

  async sendStaffOtp(to: string, otp: string, staffName: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[DEV] Staff OTP for ${to}: ${otp}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: 'Your Wastrica Collect login code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Hello ${staffName},</h2>
          <p>Use the code below to sign in to Wastrica Collect:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;
                      padding:20px;background:#f4f4f4;border-radius:8px;margin:24px 0">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px">This code expires in 10 minutes. Do not share it.</p>
        </div>`,
    }).catch((err) => {
      throw new InternalServerErrorException({
        message: 'Failed to send login code email',
        detail: err?.message,
      });
    });
  }

  async sendOtp(to: string, otp: string, residentName: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[DEV] Email OTP for ${to}: ${otp}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: 'Your Wastrica Collect verification code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Welcome to Wastrica Collect, ${residentName}!</h2>
          <p>Your waste company has registered you on the platform.</p>
          <p>Use the code below to verify your email and set your password:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;
                      padding:20px;background:#f4f4f4;border-radius:8px;margin:24px 0">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px">This code expires in 15 minutes. Do not share it.</p>
        </div>`,
    }).catch((err) => {
      throw new InternalServerErrorException({
        message: 'Failed to send verification email',
        detail: err?.message,
      });
    });
  }
}
