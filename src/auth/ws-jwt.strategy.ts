import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from 'src/users/user.repository';
import { UserEntity } from 'src/users/entities/user.entity';

@Injectable()
export class WsJwtStrategy extends PassportStrategy(Strategy, 'wsjwt') {
  constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
  ) {
    super({
      // jwtFromRequest: ExtractJwt.fromUrlQueryParameter('bearerToken'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'secret',
    });
  }

  async validate(payload) {
    const { id } = payload;

    const userEntity: UserEntity = await this.userRepository.findUserById(id);
    if (!userEntity) {
      throw new UnauthorizedException();
    }
    // return userEntity;
    // try {
    //   return this.userRepository.findUserById(id);
    // } catch (error) {
    //   throw new WsException('Unauthorized access');
    // }
  }
}
