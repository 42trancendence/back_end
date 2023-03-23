import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Patch,
  Header,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserInfo } from './UserInfo';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { getUser } from 'src/auth/get-user.decorator';
import { UserEntity } from './entities/user.entity';

@Controller('users')
@ApiTags('User API')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: '유저 생성 API', description: '유저를 생성한다.' })
  @Header('Access-Control-Allow-Origin', '*')
  @ApiBody({
    type: CreateUserDto,
  })
  @UsePipes(ValidationPipe)
  async createUser(@Body() createUserDto: CreateUserDto): Promise<void> {
    return this.usersService.createUser(createUserDto);
  }

  // @Post('/email-verify')
  // @ApiOperation({
  //   summary: '유저 email 인증 API',
  //   description: '회원가입한 유저의 email 주소로 인증 메일을 발송한다.',
  // })
  // @ApiBody({ type: VerifyEmailDto })
  // async verifyEmail(@Query() dto: VerifyEmailDto): Promise<string> {
  //   const { signupVerifyToken } = dto;
  //
  //   return await this.usersService.verifyEmail(signupVerifyToken);
  // }
  //
  // @Post('/login')
  // @ApiOperation({
  //   summary: '유저 로그인 API',
  //   description: '유저 email, password로 로그인한다.',
  // })
  // async login(@Body() dto: UserLoginDto, @Res() res: Response) {
  //   const { email, password } = dto;
  //   const token: string = await this.usersService.login(email, password);
  //   console.log(token);
  //   res.setHeader('Authorization', token);
  //   res.setHeader('Access-Control-Allow-Credentials', 'true');
  //   res.cookie('jwt', token, {
  //     httpOnly: true,
  //     maxAge: 24 * 60 * 60 * 1000, // 1 day
  //   });
  //   console.log(res);
  //   return res.send({
  //     message: 'success',
  //   });
  // }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  @ApiOperation({
    summary: '유저 정보 API',
    description: '유저의 정보를 얻는다.',
  })
  async getUserInfo(@Param('id') userId: string): Promise<UserInfo> {
    return this.usersService.getUserInfo(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @UsePipes(ValidationPipe)
  @Patch(':id/status')
  @ApiOperation({
    summary: '유저 정보 업데이트 API',
    description: '유저의 정보(password, img...)를 업데이트한다.',
  })
  async updateUserInfo(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @getUser() userInfo: UserEntity,
  ): Promise<UserInfo> {
    return this.usersService.updateUserInfo(userId, updateUserDto, userInfo);
  }
}
