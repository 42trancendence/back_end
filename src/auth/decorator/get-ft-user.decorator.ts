import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const getFtUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest().user;
  return {
    id: user.id,
    email: user.emails[0].value,
    name: user.username,
    avatarImageUrl: user._json.image.link,
  };
});
