import {
  Controller,
  Get,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Patch,
	Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserInfo } from './UserInfo';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { getUserId } from 'src/auth/decorator/get-user-id.decorator';
import { UserEntity } from './entities/user.entity';

@Controller('users')
@ApiTags('User API')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // @Post()
  // @ApiOperation({ summary: '유저 생성 API', description: '유저를 생성한다.' })
  // @Header('Access-Control-Allow-Origin', '*')
  // @ApiBody({
  //   type: CreateUserDto,
  // })
  // @UsePipes(ValidationPipe)
  // async createUser(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
  //   return this.usersService.createUser(createUserDto);
  // }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '유저 회원가입 API',
    description: '유저 회원가입 API',
  })
  @Post()
  async createUser() {
    // TODO: 회원가입 API
  }

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
    @getUserId() userInfo: UserEntity,
  ): Promise<UserInfo> {
    return this.usersService.updateUserInfo(userId, updateUserDto, userInfo);
  }
}
