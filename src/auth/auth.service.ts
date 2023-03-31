import { Injectable } from '@nestjs/common';
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

  async createAccessToken(ftUser: FtUserDto, res: Response) {
    const payload = { id: ftUser.id };
    const token = await this.jwtService.signAsync(payload, { expiresIn: '2h' });

    res.header('Authorization', `Bearer ${token}`);
    console.log(token);
  }
  async createRefreshToken(user: UserEntity, res: Response) {
    const payload = { id: user.id };
    const token = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
    res.cookie('refreshToken', token);
    await this.userRepository.saveRefreshToken(token, user);
  }

  async logout(user: UserEntity, res: Response) {
    res.cookie('refreshToken', '');
    user.refreshToken = '';
    await this.userRepository.save(user);
    return res.redirect('http://localhost:4000/login');
  }

  async login(user: UserEntity, res: Response) {
    await this.createRefreshToken(user, res);
    return res.redirect(301, 'http://localhost:4000/lobby/overview');
  }

  isVerifiedToken(socket: Socket) {
    const auth = socket.handshake.headers.authorization;
    const token = auth.split(' ')[1];
    const payload = this.jwtService.verify(token);
    return payload;
  }
}
