import {
  Controller,
  Get,
  Logger,
  Res,
  UseGuards,
  UnauthorizedException,
  Post,
  Body,
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
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { AccessGuard } from './guard/access-token.guard';
import { RefreshGuard } from './guard/refresh-token.guard';

@ApiTags('Auth API')
@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  private readonly authLogger = new Logger(AuthController.name);

  @Post('signup')
  @UseGuards(AccessGuard)
  @ApiOperation({
    summary: '유저 회원가입 API',
    description: '유저 회원가입 API',
  })
  async createUser(
    @getUser() user: UserEntity,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.authLogger.verbose('[POST] /signup');
    if (!user.isVerified) {
      throw new UnauthorizedException('2차 인증이 되지 않았습니다.');
    }
    await this.usersService.updateUserInfo(updateUserDto, user);
  }

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
  @UseGuards(FortyTwoGuard)
  async login(@getFtUser() ftUser: FtUserDto, @Res() res: Response) {
    this.authLogger.verbose('[GET] /login/callback');
    this.authLogger.debug(ftUser);

    const user = await this.usersService.getUserByEmail(ftUser.email);
    const url = 'http://localhost:4000/auth/callback';
    if (!user || user.isVerified === true) {
      if (!user) {
        this.authLogger.log('회원가입이 되어있지 않습니다.');
        await this.usersService.createUser(ftUser);
      }
      const token = await this.authService.create2faToken(ftUser, res);
      return res.redirect(301, url + '?token=' + token);
    }
    return this.authService.login(user, res);

    // if (!user || !user.isVerified) {
    // this.authLogger.log('회원가입이 되어있지 않습니다.');
    // await this.usersService.createUser(ftUser);
    // const url = 'http://localhost:4000/auth/callback';
    // return res.redirect(301, url + '?token=' + token);
    // }
    // return this.authService.login(user, res, token);
  }

  @Get('/logout')
  // @UseGuards(AccessGuard)
  @ApiOperation({
    summary: '유저 로그아웃 API',
    description: '쿠키와 db의 refresh token 파기 API.',
  })
  async logout(@Res() res: Response) {
    this.authLogger.verbose('[GET] /logout');

    return await this.authService.logout(res);
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
