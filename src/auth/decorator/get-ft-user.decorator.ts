import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// NOTE: custom decorator
export const getFtUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest().user;
  console.log(user);
  return {
    id: user.id,
    email: user.emails[0].value,
    name: user.username,
    avatarImageUrl: user._json.image.link,
  };
});
