import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { Socket } from 'socket.io';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserRepository } from 'src/users/repository/user.repository';
import { FtUserDto } from './dto/ft-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userRepository: UserRepository,
  ) {}

  private AuthServiceLogger = new Logger('AuthService');

  async createAccessToken(ftUser: FtUserDto, res: Response) {
    const payload = { id: ftUser.id };
    const token = await this.jwtService.signAsync(payload, { expiresIn: '2h' });
    res.header('Authorization', 'Bearer ' + token);
    console.log(token);
    return token;
  }
  async createRefreshToken(user: UserEntity, res: Response) {
    const payload = { id: user.id };
    const token = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
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

  async login(user: UserEntity, res: Response, token: string) {
    await this.createRefreshToken(user, res);
    const url = 'http://localhost:4000/auth/callback';
    return res.redirect(301, url + '?token=' + token);
  }

  isVerifiedToken(socket: Socket) {
    const auth = socket.handshake.headers.authorization;
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
