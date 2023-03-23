import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import authConfig from 'src/config/authConfig';
import axios from 'axios';
import { AuthUserDto } from './dto/auth-user.dto';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, 'ft') {
  constructor(
    @Inject(authConfig.KEY) private config: ConfigType<typeof authConfig>,
  ) {
    super({
      authorizationURL: config.authorizationURL,
      tokenURL: 'https://api.intra.42.fr/oauth/token',
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackUri,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
  ): Promise<AuthUserDto> {
    const req = await axios.get('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const authUser = new AuthUserDto();

    authUser.image = req.data.image.link;
    authUser.email = req.data.email;
    authUser.name = req.data.login;
    return authUser;
  }
}
