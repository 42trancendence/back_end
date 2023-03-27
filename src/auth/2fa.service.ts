import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toFileStream } from 'qrcode';
import { UserEntity } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { Response } from 'express';

@Injectable()
export class TwoFactorAuthService {
  constructor(private readonly usersService: UsersService) {}

  async generateSecret(user: UserEntity) {
    const secret = authenticator.generateSecret();

    const otpAuthUrl = authenticator.keyuri(
      'tjddnd3116@gmail.com',
      'secret',
      secret,
    );

    await this.usersService.setTwoFactorAuthSecret(user, secret);
    return { secret, otpAuthUrl };
  }

  async pipeQrCodeStream(res: Response, otpAuthUrl: string) {
    return toFileStream(res, otpAuthUrl);
  }
  async isVerifyQRCode(user: UserEntity, code: string): Promise<boolean> {
    return authenticator.verify({
      token: code,
      secret: user.twoFactorAuthSecret,
    });
  }
}
