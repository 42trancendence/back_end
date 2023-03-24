import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// NOTE: custom decorator
export const getFtUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest().user;
  return {
    id: user.id,
    // email: user.emails[0].value,
  };
});
