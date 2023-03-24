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

  async createAccessToken(id: string) {
    const payload = { id };

    return await this.jwtService.signAsync(payload, { expiresIn: '2h' });
  }
  async createRefreshToken(id: string) {
    const payload = { id };

    return await this.jwtService.signAsync(payload, { expiresIn: '7d' });
  }

  async logout(user: UserEntity, res: Response) {
    res.cookie('refreshToken', '');
    user.refreshToken = '';
    this.userRepository.save(user);
  }

  async login(user: UserEntity, res: Response) {}

  isVerifiedToken(socket: Socket) {
    const auth = socket.handshake.headers.authorization;
    const token = auth.split(' ')[1];
    const payload = this.jwtService.verify(token);
    return payload;
  }
}
