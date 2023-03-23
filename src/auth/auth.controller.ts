import {
  Body,
  Controller,
  Get,
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
import { FortyTwoGuard } from './forty-two.guard';
import { getUser } from './get-user.decorator';

@ApiTags('Auth API')
@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Get('/login')
  @ApiOperation({
    summary: '유저 로그인 API',
    description: '42api를 이용하여 로그인 한다.',
  })
  @UseGuards(FortyTwoGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  OAuthLogin() {}

  @Get('/login/callback')
  @UseGuards(FortyTwoGuard)
  async callbackLogin(@getUser() authUser: AuthUserDto): Promise<string> {
    const user = await this.usersService.getUserByEmail(authUser.email);

    if (!user) {
      const createUser = new CreateUserDto();
      createUser.email = authUser.email;
      createUser.name = authUser.name;
      createUser.password = '';
      createUser.image = authUser.image;
      await this.usersService.createUser(createUser);
    }
    return this.authService.createJwt({
      name: authUser.name,
      email: authUser.email,
    });
  }

  @Post('/login')
  @UsePipes(ValidationPipe)
  async login(@Body() userLoginDto: UserLoginDto): Promise<string> {
    const { email, password } = userLoginDto;
    return await this.authService.login(email, password);
  }
}
