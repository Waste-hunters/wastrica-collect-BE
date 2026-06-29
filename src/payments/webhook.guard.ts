import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Verifies provider webhook calls using a shared secret sent in the
 * `x-webhook-secret` header. Configure the expected value via the
 * MOMO_WEBHOOK_SECRET environment variable.
 *
 * In development, if no secret is configured the guard allows the request
 * through (with a warning) so the sandbox/simulated payloads work out of the box.
 */
@Injectable()
export class WebhookGuard implements CanActivate {
  private readonly logger = new Logger(WebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('MOMO_WEBHOOK_SECRET');

    if (!expected) {
      this.logger.warn(
        'MOMO_WEBHOOK_SECRET is not set — webhook signature check is disabled (dev only).',
      );
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-webhook-secret'];

    if (provided !== expected) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
