import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { Response } from 'express';
import { getUser } from 'src/auth/decorator/get-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from 'src/auth/auth.service';

@UseGuards(AuthGuard('2fa'))
@ApiTags('2fa API')
@Controller('2fa')
export class TwoFactorAuthController {
  constructor(
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly authService: AuthService,
  ) {}

  private readonly twoFactorLogger = new Logger(TwoFactorAuthController.name);

  @Get()
  @ApiOperation({
    summary: '2fa 인증확인 API',
    description: '2fa 인증확인 API',
  })
  async checkIs2faEnabled(@getUser() user: UserEntity, @Res() res: Response) {
    this.twoFactorLogger.verbose('[GET] /2fa');
    if (user.isVerified) {
      return res.status(200).json({ token: '' });
    }
    await this.authService.createRefreshToken(user, res);
    const token = await this.authService.createAccessToken(user, res);
    return res.status(200).json({ token });
  }

  @Post('qrcode')
  @ApiOperation({
    summary: '2fa QR코드 생성 API',
    description: '2fa QR코드 생성 API',
  })
  @ApiResponse({
    status: 201,
    description: 'QR코드 생성 성공',
  })
  @ApiResponse({
    status: 401,
    description: '유저 권한없음',
  })
  async createQRCode(@getUser() user: UserEntity, @Res() res: Response) {
    this.twoFactorLogger.verbose('[POST] /2fa/qrcode');

    const { otpAuthUrl } = await this.twoFactorAuthService.generateQRCodeSecret(
      user,
    );
    return this.twoFactorAuthService.pipeQrCodeStream(res, otpAuthUrl);
  }

  @Post('qrcode/turn-on')
  @ApiOperation({
    summary: '2fa QR코드 확인 API',
    description: '2fa QR코드 확인 API',
  })
  @ApiResponse({
    status: 401,
    description: '2fa 인증 실패',
  })
  @ApiResponse({
    status: 201,
    description: '2fa 인증 성공',
  })
  async turnOn2faQRCode(
    @getUser() user: UserEntity,
    @Body('code') code: string,
    @Res() res: Response,
  ) {
    this.twoFactorLogger.verbose(`[POST] /2fa/qrcode/turn-on: ${user.email}`);

    const isCodeValid = await this.twoFactorAuthService.isVerifyQRCode(
      user,
      code,
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('2fa code is not valid');
    }

    await this.authService.createRefreshToken(user, res);
    const token = await this.authService.createAccessToken(user, res);
    return res.status(201).json({ token });
    // await this.twoFactorAuthService.turnOnTwoFactorAuth(user);
  }

  @Post('email')
  @ApiOperation({
    summary: '2fa 이메일 인증 API',
    description: '2fa 이메일 인증 API',
  })
  async sendEmailAuthCode(@getUser() user: UserEntity) {
    this.twoFactorLogger.verbose(`[POST] /2fa/email: ${user.email}`);

    return await this.twoFactorAuthService.sendTwoFactorAuthEmail(user);
  }

  @Post('email/turn-on')
  @ApiOperation({
    summary: '2fa 이메일 인증 확인 API',
    description: '2fa 이메일 인증 확인 API',
  })
  async turnOn2faEmail(
    @Body('code') code: string,
    @getUser() user: UserEntity,
    @Res() res: Response,
  ) {
    this.twoFactorLogger.verbose(`[POST] /2fa/email/turn-on: ${code}`);
    const isCodeValid = await this.twoFactorAuthService.isVerifyEmailCode(
      code,
      user,
    );
    if (!isCodeValid) {
      throw new NotFoundException('2fa code is not valid');
    }

    await this.authService.createRefreshToken(user, res);
    const token = await this.authService.createAccessToken(user, res);
    return res.status(201).json({ token });

    // await this.twoFactorAuthService.turnOnTwoFactorAuth(user);
  }
}
