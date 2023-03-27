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
import { UsersService } from 'src/users/users.service';
import { TwoFactorAuthService } from './2fa.service';
import { getUserId } from './decorator/get-user-id.decorator';
import { Response } from 'express';

@ApiTags('2fa API')
@Controller('2fa')
export class TwoFactorAuthController {
  constructor(
    private twoFactorAuthService: TwoFactorAuthService,
    private usersService: UsersService,
  ) {}
  private readonly twoFactorLogger = new Logger(TwoFactorAuthController.name);

  @Post('qrcode')
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: '2fa QR코드 생성 API',
    description: '2fa QR코드 생성 API',
  })
  async getQRCode(@getUserId() userId: string, @Res() res: Response) {
    this.twoFactorLogger.verbose('[POST] /2fa/qrcode');

    const user = await this.usersService.getUserById(userId);

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
    const user = await this.usersService.getUserById(userId);
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
