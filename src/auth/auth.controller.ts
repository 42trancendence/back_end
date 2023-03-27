import {
  Controller,
  Get,
  Logger,
  Res,
  UseGuards,
  Post,
  UsePipes,
  Body,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { FtUserDto } from './dto/ft-user.dto';
import { FortyTwoGuard } from './guard/forty-two.guard';
import { getUserId } from './decorator/get-user-id.decorator';
import { getFtUser } from './decorator/get-ft-user.decorator';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Auth API')
@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  private readonly authLogger = new Logger(AuthController.name);

  @Post('/signup')
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: '유저 회원가입 API',
    description: '유저 회원가입 API',
  })
  @UsePipes(ValidationPipe)
  async signUp(
    @Body() createUserDto: CreateUserDto,
    @getUserId() userId: string,
    @Res() res: Response,
  ) {
    this.authLogger.verbose(`[POST] /signup body: ${createUserDto}`);

    const user = await this.usersService.createUser(
      userId,
      createUserDto.name,
      createUserDto.avatar,
    );
    return this.authService.login(user, res);
  }

  @Get('/login')
  @ApiOperation({
    summary: '유저 로그인 API',
    description: '42api 로그인 화면으로 이동시켜준다.',
  })
  @UseGuards(FortyTwoGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  OAuthLogin() {}

  @Get('/login/callback')
  @ApiOperation({
    summary: '유저 로그인 callback API',
    description: '42api를 이용하여 로그인성공시 콜백 API.',
  })
  @UseGuards(FortyTwoGuard)
  async callbackLogin(@getFtUser() ftUser: FtUserDto, @Res() res: Response) {
    this.authLogger.verbose('[GET] /login/callback');
    this.authLogger.debug(ftUser);

    const user = await this.usersService.getUserById(ftUser.id);
    await this.authService.createAccessToken(ftUser.id, res);
    if (!user) {
      this.authLogger.log('유저가 존재하지 않아 회원가입으로 리디렉팅');
      return res.redirect('http://localhost:4000/signup');
    }
    return this.authService.login(user, res);
  }

  @Get('/logout')
  @ApiOperation({
    summary: '유저 로그아웃 API',
    description: '쿠키와 db의 refresh token 파기 API.',
  })
  @UseGuards(AuthGuard())
  async logout(@getUserId() userId: string, @Res() res: Response) {
    this.authLogger.verbose('[GET] /logout');

    const user = await this.usersService.getUserById(userId);
    if (!user) {
      this.authLogger.error('유저가 존재하지 않습니다.');
      throw new UnauthorizedException('유저가 존재하지 않습니다.');
    }
    return await this.authService.logout(user, res);
  }
}
