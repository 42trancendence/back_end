import { Controller, Logger, Post, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation } from '@nestjs/swagger';
import { getUserId } from 'src/auth/decorator/get-user-id.decorator';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { Response } from 'express';

@Controller('two-factor-auth')
export class TwoFactorAuthController {
  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  private readonly twoFactorLogger = new Logger(TwoFactorAuthController.name);

  @Post('qrcode')
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: '2fa QR코드 생성 API',
    description: '2fa QR코드 생성 API',
  })
  // TODO: fix @getUserId() => @getTwoFactorAuth()
  async getQRCode(@getUserId() userId: string, @Res() res: Response) {
    this.twoFactorLogger.verbose('[POST] /2fa/qrcode');

    const { otpAuthUrl } = await this.twoFactorAuthService.generateSecret(user);

    return this.twoFactorAuthService.pipeQrCodeStream(res, otpAuthUrl);
  }

  @Post('qrcode/turn-on')
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: '2fa QR코드 확인 API',
    description: '2fa QR코드 확인 API',
  })
  async turnOn2faQRCode(@getUserId() userId: string, @Body() code: string) {
    const isCodeValid = await this.twoFactorAuthService.isVerifyQRCode(
      user,
      code,
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('2fa code is not valid');
    }
    await this.usersService.turnOnTwoFactorAuth(user);
  }

}
