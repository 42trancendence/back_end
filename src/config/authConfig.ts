import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  twoFactorSecret: process.env.TWO_FACTOR_SECRET,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackUri: process.env.CALLBACK_URI,
  frontCallbackUri: process.env.FRONT_CALLBACK_URI,
  serverAddress: process.env.SERVER_ADDRESS,
  tokenDomain: process.env.TOKEN_DOMAIN,
  twoFactorTokenExpire: process.env.TWO_FACTOR_EXPIRATION,
  accessTokenExpire: process.env.ACCESS_TOKEN_EXPIRATION,
  refreshTokenExpire: process.env.REFRESH_TOKEN_EXPIRATION,
}));
