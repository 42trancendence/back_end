import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcryptjs';

interface User {
  name: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  createJwt(user: User) {
    const payload = { ...user };

    return this.jwtService.sign(payload);
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.usersService.getUserByEmail(email);
    if (!user) {
      throw new NotFoundException('유저가 존재하지 않습니다.');
    }

    if (await bcrypt.compare(password, user.password)) {
      return this.createJwt({
        name: user.name,
        email: user.email,
      });
    } else {
      throw new UnauthorizedException('비밀번호가 올바르지 않습니다.');
    }
  }

  isVerifiedToken(socket: Socket) {
    const auth = socket.handshake.headers.authorization;
    const token = auth.split(' ')[1];
    const payload = this.jwtService.verify(token);
    return payload;
  }
}
