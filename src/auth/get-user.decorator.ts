import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// NOTE: custom decorator
export const getUser = createParamDecorator((ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});
