import { Controller, Get, Logger, Res, UseGuards, Post, UsePipes, Body, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { FtUserDto } from './dto/ft-user.dto';
import { FortyTwoGuard } from './forty-two.guard';
import { getFtUser } from './get-ft-user.decorator';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@ApiTags('Auth API')
@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  private readonly authLogger = new Logger(AuthController.name);

  @Post('/signup')
  @ApiOperation({
    summary: '유저 회원가입 API',
    description: '유저 회원가입 API',
  })
  @UsePipes(ValidationPipe)
  async signUp(@Body() createUserDto: CreateUserDto): Promise<string> {
    this.authLogger.verbose(`[POST] /signup body: ${createUserDto}`);
    const user = await this.usersService.createUser(createUserDto);
    return this.authService.createJwt({
      name: user.name,
      id: user.id,
    });
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
    // log for user info by 42 api
    this.authLogger.debug(ftUser);
    const user = await this.usersService.getUserById(
      ftUser.id
    );
    if (!user) {
      return res.redirect('http://localhost:4000/signup');
    }
    const token = this.authService.createJwt({
      name: user.name,
      id: user.id,
    });
    res.setHeader('Authorization', `Bearer ` + token);
    return res.redirect('http://localhost:4000/lobby');
  }

  // @Post('/login')
  // @UsePipes(ValidationPipe)
  // async login(@Body() userLoginDto: UserLoginDto): Promise<string> {
  //   this.authLogger.verbose(`[POST] /login body: ${userLoginDto}`);
  //   const { email, password } = userLoginDto;
  //   return await this.authService.login(email, password);
  // }
}
