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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { Response } from 'express';
import { UserEntity } from 'src/users/entities/user.entity';
import { getUser } from 'src/auth/decorator/get-user.decorator';

@UseGuards(AuthGuard('jwt'))
@ApiTags('2fa API')
@Controller('2fa')
export class TwoFactorAuthController {
  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  private readonly twoFactorLogger = new Logger(TwoFactorAuthController.name);

  @Post('qrcode')
  @ApiOperation({
    summary: '2fa QR코드 생성 API',
    description: '2fa QR코드 생성 API',
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
  async turnOn2faQRCode(
    @getUser() user: UserEntity,
    @Body('code') code: string,
  ) {
    const isCodeValid = await this.twoFactorAuthService.isVerifyQRCode(
      user,
      code,
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('2fa code is not valid');
    }
    await this.twoFactorAuthService.turnOnTwoFactorAuth(user);
  }
}
