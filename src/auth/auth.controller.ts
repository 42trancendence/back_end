import {
  Controller,
  Get,
  Logger,
  Res,
  UseGuards,
  UnauthorizedException,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { FtUserDto } from './dto/ft-user.dto';
import { FortyTwoGuard } from './guard/forty-two.guard';
import { getFtUser } from './decorator/get-ft-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { UserEntity } from 'src/users/entities/user.entity';
import { getUser } from './decorator/get-user.decorator';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { Request } from 'express';

@ApiTags('Auth API')
@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  private readonly authLogger = new Logger(AuthController.name);

  @Post('signup')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '유저 회원가입 API',
    description: '유저 회원가입 API',
  })
  async createUser(
    @getUser() user: UserEntity,
    @Body() updateUserDto: UpdateUserDto,
    @Res() res: Response,
  ) {
    if (!user.isVerified) {
      throw new UnauthorizedException('2차 인증이 되지 않았습니다.');
    }
    await this.usersService.updateUserInfo(updateUserDto, user);
    return this.authService.login(user, res);
  }

  @Get('/login/callback')
  @ApiOperation({
    summary: '유저 로그인 callback API',
    description: '42api를 이용하여 로그인성공시 콜백 API.',
  })
  @ApiResponse({
    status: 302,
    description: '2fa인증을 하지 않았거나 첫 로그인일때 signup으로 리다이렉트',
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공시 lobby으로 리다이렉트',
  })
  @UseGuards(FortyTwoGuard)
  async login(
    @getFtUser() ftUser: FtUserDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    this.authLogger.verbose('[GET] /login/callback');
    this.authLogger.debug(ftUser);

    console.log(req.session);

    const user = await this.usersService.getUserByEmail(ftUser.email);
    await this.authService.createAccessToken(ftUser, res);

    if (!user || !user.isVerified) {
      this.authLogger.log('회원가입이 되어있지 않습니다.');
      await this.usersService.createUser(ftUser);
      return res.redirect('http://localhost:4000/signup');
    }
    return this.authService.login(user, res);
  }

  @Get('/logout')
  @ApiOperation({
    summary: '유저 로그아웃 API',
    description: '쿠키와 db의 refresh token 파기 API.',
  })
  @UseGuards(AuthGuard('jwt'))
  async logout(@getUser() user: UserEntity, @Res() res: Response) {
    this.authLogger.verbose('[GET] /logout');

    if (!user) {
      this.authLogger.error('유저가 존재하지 않습니다.');
      throw new UnauthorizedException('유저가 존재하지 않습니다.');
    }
    return await this.authService.logout(user, res);
  }
}
