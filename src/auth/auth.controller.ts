import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UserLoginDto } from 'src/users/dto/user-login.dto';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { AuthUserDto } from './dto/auth-user.dto';
import {FtUserDto} from './dto/ft-user.dto';
import { FortyTwoGuard } from './forty-two.guard';
import {getFtUser} from './get-ft-user.decorator';
import { getUser } from './get-user.decorator';

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
  async callbackLogin(@getFtUser() ftUser: FtUserDto): Promise<string> {
    this.authLogger.verbose('[GET] /login/callback');
    // log for user info by 42 api
    this.authLogger.debug(ftUser);
    const user = await this.usersService.getUserById(ftUser.id);
    if (!user) {
      return '';
    }
    return this.authService.createJwt({
      name: user.name,
      email: user.email,
    });
  }

  // @Post('/login')
  // @UsePipes(ValidationPipe)
  // async login(@Body() userLoginDto: UserLoginDto): Promise<string> {
  //   this.authLogger.verbose(`[POST] /login body: ${userLoginDto}`);
  //   const { email, password } = userLoginDto;
  //   return await this.authService.login(email, password);
  // }
}
