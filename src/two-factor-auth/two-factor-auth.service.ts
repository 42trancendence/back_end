import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toFileStream } from 'qrcode';
import { Response } from 'express';
import { UserEntity } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class TwoFactorAuthService {
  constructor(private usersService: UsersService) {}
  async generateQRCodeSecret(user: UserEntity) {
    const secret = authenticator.generateSecret();

    // TODO: change to user's email and second parameter will be changed env variable
    const otpAuthUrl = authenticator.keyuri(
      'tjddnd3116@gmail.com',
      'secret',
      secret,
    );
    await this.usersService.setTwoFactorAuthSecret(user, secret);
    return { otpAuthUrl };
  }

  async pipeQrCodeStream(res: Response, otpAuthUrl: string) {
    return toFileStream(res, otpAuthUrl);
  }

  async isVerifyQRCode(user: UserEntity, code: string) {
    return authenticator.verify({
      token: code,
      secret: user.twoFactorAuthCode,
    });
  }

  async turnOnTwoFactorAuth(user: UserEntity) {
    await this.usersService.turnOnTwoFactorAuth(user);
  }
}
