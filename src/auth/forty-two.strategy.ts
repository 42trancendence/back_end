import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-42';
import authConfig from 'src/config/authConfig';
import { AuthUserDto } from './dto/auth-user.dto';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, 'ft') {
<<<<<<< HEAD
  private readonly ftStrategyLogger = new Logger(FortyTwoStrategy.name);
=======
  private readonly logger = new Logger(FortyTwoStrategy.name);
>>>>>>> d4cd91ad96c4ae2410f87294fc56a289b3c86415
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

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<AuthUserDto> {
    return profile;
  }
}
