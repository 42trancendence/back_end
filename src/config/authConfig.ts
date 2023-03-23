import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackUri: process.env.CALLBACK_URI,
  authorizationURL: process.env.AUTHORIZATION_URI,
}));
