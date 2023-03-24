import { Controller, Get, Logger, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { FtUserDto } from './dto/ft-user.dto';
import { FortyTwoGuard } from './forty-two.guard';
import { getFtUser } from './get-ft-user.decorator';

@ApiTags('Auth API')
@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  private readonly authLogger = new Logger(AuthController.name);

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
      '01GW6V4CJZEDTGTWT1W88J93RZ',
    );
    if (!user) {
      return res.redirect('http://localhost:4000/signup');
    }
    const token = this.authService.createJwt({
      name: user.name,
      email: user.email,
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
