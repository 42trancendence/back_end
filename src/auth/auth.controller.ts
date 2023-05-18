import {
  Controller,
  Get,
  Inject,
  Logger,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { FtUserDto } from './dto/ft-user.dto';
import { FortyTwoGuard } from './guard/forty-two.guard';
import { getFtUser } from './decorator/get-ft-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';
import { getUser } from './decorator/get-user.decorator';
import { RefreshGuard } from './guard/refresh-token.guard';
import authConfig from 'src/config/authConfig';
import { ConfigType } from '@nestjs/config';
import { ThrottlerBehindProxyGuard } from './guard/throttler-behind-proxy.guard';

@ApiTags('Auth API')
@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    @Inject(authConfig.KEY) private config: ConfigType<typeof authConfig>,
  ) {}

  private readonly authLogger = new Logger(AuthController.name);

  @UseGuards(ThrottlerBehindProxyGuard)
  @UseGuards(FortyTwoGuard)
  @Get('/login/callback')
  @ApiOperation({
    summary: '유저 로그인 callback API',
    description: '42api를 이용하여 로그인성공시 콜백 API.',
  })
  @ApiResponse({
    status: 301,
    description:
      '2fa인증을 하지 않았거나 첫 로그인일때 auth/callback 으로 리다이렉트',
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공시 lobby으로 리다이렉트',
  })
  async login(@getFtUser() ftUser: FtUserDto, @Res() res: Response) {
    this.authLogger.verbose('[GET] /login/callback');
    this.authLogger.debug(ftUser);

    const user = await this.usersService.getUserByEmail(ftUser.email);
    const url = this.config.frontCallbackUri;
    if (!user || user.isTwoFactorEnable === true) {
      if (!user) {
        this.authLogger.log('회원가입이 되어있지 않습니다.');
        await this.usersService.createUser(ftUser);
      }
      const token = await this.authService.create2faToken(ftUser, res);
      return res.redirect(301, url + '?token=' + token);
    }
    return this.authService.login(user, res, url);
  }

  @Get('/logout')
  // @UseGuards(AccessGuard)
  @ApiOperation({
    summary: '유저 로그아웃 API',
    description: '쿠키와 db의 refresh token 파기 API.',
  })
  async logout(@Res() res: Response) {
    this.authLogger.verbose('[GET] /logout');

    const url = this.config.frontCallbackUri;

    return await this.authService.logout(res, url);
  }

  @Get('/refresh')
  @UseGuards(RefreshGuard)
  @ApiOperation({
    summary: '유저 리프레시 토큰 API',
    description: '리프레시 토큰을 이용하여 새로운 액세스 토큰을 발급받는 API.',
  })
  async refreshToken(@getUser() user: UserEntity, @Res() res: Response) {
    this.authLogger.verbose('[GET] /refresh');

    const accessToken = await this.authService.createAccessToken(user, res);
    await this.authService.createRefreshToken(user, res);
    return res.status(200).json({ message: 'success', accessToken });
  }
}
