import Mail = require('nodemailer/lib/mailer');
import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toFileStream } from 'qrcode';
import { Response } from 'express';
import { UserEntity } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import emailConfig from 'src/config/emailConfig';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class TwoFactorAuthService {
  private transporter: Mail;

  constructor(
    private usersService: UsersService,
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

  async sendTwoFactorAuthEmail(
    user: UserEntity,
  ) {
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    const mailOptions: EmailOptions = {
      to: user.email,
      subject: '2단계 인증 메일',
      html: `
      2단계 인증을 위해 6자리 숫자를 입력해주세요.<br/>
      <h1>6자리 인증 코드 : ${code}</h1>
      `,
    };

    console.log('email: ', user.email);

    await this.usersService.setTwoFactorAuthSecret(user, code);

    return await this.transporter.sendMail(mailOptions);
  }

  async isVerifyEmailCode(code: string, user: UserEntity) : Promise<boolean> {
    return code === user.twoFactorAuthCode;
  }
}