import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-42';
import authConfig from 'src/config/authConfig';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, 'ft') {
  private readonly ftStrategyLogger = new Logger(FortyTwoStrategy.name);
  constructor(
    @Inject(authConfig.KEY) private config: ConfigType<typeof authConfig>,
  ) {
    super({
      authorizationURL: config.authorizationURL,
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackUri,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    return profile;
  }
}
