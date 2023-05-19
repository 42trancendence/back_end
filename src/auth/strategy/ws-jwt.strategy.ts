import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from 'src/users/repository/user.repository';
import { UserEntity } from 'src/users/entities/user.entity';
import { ConfigType } from '@nestjs/config';
import authConfig from 'src/config/authConfig';

@Injectable()
export class WsJwtStrategy extends PassportStrategy(Strategy, 'wsjwt') {
  constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
    @Inject(authConfig.KEY)
    config: ConfigType<typeof authConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload) {
    const { id } = payload;

    if (!id) {
      throw new UnauthorizedException('user not found');
    }
    const userEntity: UserEntity = await this.userRepository.findUserById(id);
    if (!userEntity) {
      throw new UnauthorizedException('user not found');
    }
    return userEntity;
  }
}
