import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// NOTE: custom decorator
export const getUserBySocket = createParamDecorator(
  (data, ctx: ExecutionContext) => {
    const req = ctx.switchToWs().getClient().handshake;
    return req.user;
  },
);
