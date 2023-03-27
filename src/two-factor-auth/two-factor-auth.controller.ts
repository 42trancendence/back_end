import {
  Body,
  Controller,
  Logger,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation } from '@nestjs/swagger';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { Response } from 'express';
import { getTwoFactorAuth } from './decorator/get-two-factor-auth.decorator';

@Controller('2fa')
export class TwoFactorAuthController {
  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  private readonly twoFactorLogger = new Logger(TwoFactorAuthController.name);

  @Post('qrcode')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '2fa QR코드 생성 API',
    description: '2fa QR코드 생성 API',
  })
  async getQRCode(
    @getTwoFactorAuth() twoFactorId: string,
    @Res() res: Response,
  ) {
    this.twoFactorLogger.verbose('[POST] /2fa/qrcode');

    const twoFactorAuth = await this.twoFactorAuthService.getTwoFactorAuthById(
      twoFactorId,
    );

    const { otpAuthUrl } = await this.twoFactorAuthService.generateSecret(
      twoFactorAuth,
    );

    return this.twoFactorAuthService.pipeQrCodeStream(res, otpAuthUrl);
  }

  @Post('qrcode/turn-on')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '2fa QR코드 확인 API',
    description: '2fa QR코드 확인 API',
  })
  async turnOn2faQRCode(
    @getTwoFactorAuth() twoFactorId: string,
    @Body() code: string,
  ) {
    const twoFactorAuth = await this.twoFactorAuthService.getTwoFactorAuthById(
      twoFactorId,
    );
    const isCodeValid = await this.twoFactorAuthService.isVerifyQRCode(
      twoFactorAuth,
      code,
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('2fa code is not valid');
    }
    await this.twoFactorAuthService.turnOnTwoFactorAuth(twoFactorAuth);
  }
}
