import {
  Controller,
  Get,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Patch,
  Logger,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserInfo } from './UserInfo';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity';
import { getUser } from 'src/auth/decorator/get-user.decorator';

@Controller('users')
@ApiTags('User API')
export class UsersController {
  private readonly userLogger = new Logger(UsersController.name);

  constructor(private usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  @ApiOperation({
    summary: '유저 정보 API',
    description: '유저의 정보를 얻는다.',
  })
  async getUserInfo(@Param('id') userId: string): Promise<UserInfo> {
    this.userLogger.log(`유저 정보 조회: ${userId}`);

    return this.usersService.getUserInfo(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @UsePipes(ValidationPipe)
  @Patch('me')
  @ApiOperation({
    summary: '유저 정보 업데이트 API',
    description: '유저의 정보를 업데이트한다.',
  })
  async updateUserInfo(
    @getUser() user: UserEntity,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserInfo> {
    this.userLogger.log(`유저 정보 업데이트: ${user.id}`);

    return this.usersService.updateUserInfo(updateUserDto, user);
  }
}
