import {
  Controller,
  Get,
  Logger,
  Res,
  UseGuards,
  UnauthorizedException,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: '유저 회원가입 API' })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: UpdateUserDto })
  @ApiUnauthorizedResponse({ description: '2차 인증이 되지 않았습니다.' })
  @ApiUnauthorizedResponse({ description: 'Invalid access token' })
  async createUser(
    @getUser() user: UserEntity,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    if (!user.isVerified) {
      throw new UnauthorizedException('2차 인증이 되지 않았습니다.');
    }
    await this.usersService.updateUserInfo(updateUserDto, user);
  }

  @Get('/login/callback')
  @ApiOperation({ summary: '유저 로그인 callback' })
  @ApiResponse({
    status: 302,
    description:
      '2fa인증을 하지 않았거나 첫 로그인일때 auth/callback 으로 리다이렉트',
  })
  @ApiOkResponse({ description: '로그인 성공시 lobby으로 리다이렉트' })
  @UseGuards(FortyTwoGuard)
  async login(@getFtUser() ftUser: FtUserDto, @Res() res: Response) {
    this.authLogger.verbose('[GET] /login/callback');
    this.authLogger.debug(ftUser);

    const user = await this.usersService.getUserByEmail(ftUser.email);
    const token = await this.authService.createAccessToken(ftUser, res);

    if (!user || !user.isVerified) {
      this.authLogger.log('회원가입이 되어있지 않습니다.');
      await this.usersService.createUser(ftUser);
      const url = 'http://localhost:4000/auth/callback';
      return res.redirect(301, url + '?token=' + token);
    }
    return this.authService.login(user, res, token);
  }

  @Get('/logout')
  @UseGuards(AccessGuard)
  @ApiOperation({ summary: '유저 로그아웃' })
  async logout(@getUser() user: UserEntity, @Res() res: Response) {
    this.authLogger.verbose('[GET] /logout');

    return await this.authService.logout(res);
  }

  @Get('/refresh')
  @UseGuards(RefreshGuard)
  @ApiOperation({
    summary: '새 엑세스 토큰 발급',
    description: '리프레시 토큰을 이용하여 새로운 액세스 토큰을 발급받는 API.',
  })
  async refreshToken(@getUser() user: UserEntity, @Res() res: Response) {
    this.authLogger.verbose('[GET] /refresh');

    await this.authService.createAccessToken(user, res);
    await this.authService.createRefreshToken(user, res);
    return res.status(200).json({ message: 'success' });
  }
}
