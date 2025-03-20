import { UserPayload } from '@/modules/auth/strategies/jwt.strategy';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): UserPayload => {
    const request = context.switchToHttp().getRequest();

    return request.user;
  },
);
