import Mail = require('nodemailer/lib/mailer');
import * as nodemailer from 'nodemailer';
import { Inject, Injectable } from '@nestjs/common';
import { TwoFactorEntity } from './entities/two-fator-auth.entity';
import { TwoFactorRepository } from './repository/two-factor-auth.repository';
import { authenticator } from 'otplib';
import { toFileStream } from 'qrcode';
import { Response } from 'express';
import emailConfig from 'src/config/emailConfig';
import { ConfigType } from '@nestjs/config';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class TwoFactorAuthService {
  private transporter: Mail;

  constructor(
    private twoFactorRepository: TwoFactorRepository,
    @Inject(emailConfig.KEY) config: ConfigType<typeof emailConfig>
  ) {
    this.transporter = nodemailer.createTransport({
      service: config.service,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });
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

  async sendTwoFactorAuthEmail(
    emailAddress: string
  ) {
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    const mailOptions: EmailOptions = {
      to: emailAddress,
      subject: '2단계 인증 메일',
      html: `
      2단계 인증을 위해 6자리 숫자를 입력해주세요.<br/>
      <h1>6자리 인증 코드 : ${code}</h1>
      `,
    };
    return await this.transporter.sendMail(mailOptions);
  }

  async getTwoFactorAuthById(twoFactorId: string) {
    return this.twoFactorRepository.getTwoFactorAuthById(twoFactorId);
  }
}
