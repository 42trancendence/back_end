import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import authConfig from 'src/config/authConfig';
import { UserRepository } from 'src/users/repository/user.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserRepository) private userRepository: UserRepository,
    @Inject(authConfig.KEY) config: ConfigType<typeof authConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload) {
    const { id } = payload;
    return id;

    // const userEntity: UserEntity = await this.userRepository.findUserById(id);
    // if (!userEntity) {
    //   throw new UnauthorizedException();
    // }
    // return userEntity;
  }
}
