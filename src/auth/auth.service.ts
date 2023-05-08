import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { Socket } from 'socket.io';
import authConfig from 'src/config/authConfig';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserRepository } from 'src/users/repository/user.repository';
import { FtUserDto } from './dto/ft-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userRepository: UserRepository,
    @Inject(authConfig.KEY) private config: ConfigType<typeof authConfig>,
  ) {}

  private AuthServiceLogger = new Logger('AuthService');

  async create2faToken(ftUser: FtUserDto, res: Response) {
    const payload = { id: ftUser.id };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.config.twoFactorSecret,
      expiresIn: '3m',
    });
    res.header('Authorization', 'Bearer ' + token);
    return token;
  }
  async createAccessToken(user: UserEntity, res: Response) {
    const payload = { id: user.id };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.config.jwtSecret,
      expiresIn: '2h',
    });
    res.header('Authorization', 'Bearer ' + token);
    console.log(token);
    return token;
  }
  async createRefreshToken(user: UserEntity, res: Response) {
    const payload = { id: user.id };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.config.jwtSecret,
      expiresIn: '7d',
    });
    res.cookie('refreshToken', token, {
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    });
  }

  async logout(res: Response) {
    res.cookie('refreshToken', '');
    return res.redirect('http://localhost:4000/login');
  }

  async login(user: UserEntity, res: Response) {
    const token = await this.createAccessToken(user, res);
    await this.createRefreshToken(user, res);
    const url = 'http://localhost:4000/auth/callback';
    return res.redirect(301, url + '?token=' + token);
  }

  isVerifiedToken(socket: Socket) {
    const auth = socket.handshake.headers?.authorization;
    if (!auth) {
      throw new UnauthorizedException('Unauthorized jwt');
    }
    const token = auth.split(' ')[1];
    return this.jwtService.verify(token);
  }

  async getUserBySocket(socket: Socket) {
    try {
      const payload = this.isVerifiedToken(socket);

      if (!payload) {
        throw new UnauthorizedException('Unauthorized jwt');
      }
      return await this.userRepository.findUserById(payload.id);
    } catch (e) {
      this.AuthServiceLogger.error('Unauthorized jwt');
    }
  }
}
