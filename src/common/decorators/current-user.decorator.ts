import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthenticatedUser = {
  sub: string;
  phoneNumber: string;
  role: string;
  companyId?: string | null;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
