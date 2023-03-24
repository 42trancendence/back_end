import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// NOTE: custom decorator
export const getUserId = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});
