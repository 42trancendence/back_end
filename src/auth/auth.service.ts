import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { Socket } from 'socket.io';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserRepository } from 'src/users/repository/user.repository';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private userRepository: UserRepository,
  ) {}

  async createAccessToken(id: string, res: Response) {
    const payload = { id };
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
    if (user.isVerified) {
      return res.redirect('http://localhost:4000/lobby');
    }
    return res.redirect('http://localhost:4000/2fa_auth');
  }

  isVerifiedToken(socket: Socket) {
    const auth = socket.handshake.headers.authorization;
    const token = auth.split(' ')[1];
    const payload = this.jwtService.verify(token);
    return payload;
  }
}
