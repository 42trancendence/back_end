import { Injectable } from '@nestjs/common';
import { TwoFactorEntity } from './entities/two-fator-auth.entity';
import { TwoFactorRepository } from './repository/two-factor-auth.repository';
import { authenticator } from 'otplib';
import { toFileStream } from 'qrcode';
import { Response } from 'express';

@Injectable()
export class TwoFactorAuthService {
  constructor(private twoFactorRepository: TwoFactorRepository) {}
  async getTwoFactorAuthById(twoFactorId: string) {
    return this.twoFactorRepository.getTwoFactorAuthById(twoFactorId);
  }

  async generateSecret(twoFactor: TwoFactorEntity) {
    const secret = authenticator.generateSecret();

    const otpAuthUrl = authenticator.keyuri(
      'tjddnd3116@gmail.com',
      'secret',
      secret,
    );

    await this.twoFactorRepository.setSecret(twoFactor, secret);
    return { otpAuthUrl };
  }

  async pipeQrCodeStream(res: Response, otpAuthUrl: string) {
    return toFileStream(res, otpAuthUrl);
  }

  async isVerifyQRCode(twoFactorAuth: TwoFactorEntity, code: string) {
    return authenticator.verify({
      token: code,
      secret: twoFactorAuth.code,
    });
  }

  async turnOnTwoFactorAuth(twoFactorAuth: TwoFactorEntity) {
    await this.twoFactorRepository.update(twoFactorAuth.id, {
      isVerified: true,
    });
  }
}
