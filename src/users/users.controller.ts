import {
  Controller,
  Get,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserInfoDto } from './dto/user-info.dto';
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
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '유저 정보 API',
    description: '유저의 정보를 얻는다.',
  })
  async getUserInfo(@Param('id') userId: string): Promise<UserInfo> {
    return this.usersService.getUserInfo(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('blocks')
  @ApiOperation({
    summary: '유저 차단 API',
    description: '유저를 차단한다.',
  })
  async blockUser(@getUser() user: UserEntity, @Body('id') friendId: string) {
    await this.usersService.blockFriend(user, friendId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @ApiOperation({
    summary: '친구 삭제 API',
    description: '친구를 삭제한다.',
  })
  async deleteFriend(
    @getUser() user: UserEntity,
    @Param('id') friendId: string,
  ) {
    await this.usersService.deleteFriend(user, friendId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('blocks/:id')
  @ApiOperation({
    summary: '유저 차단 해제API',
    description: '유저를 차단 해제한다.',
  })
  async unblockUser(
    @getUser() user: UserEntity,
    @Param('id') friendId: string,
  ) {
    await this.usersService.unblockFriend(user, friendId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('friend')
  @ApiOperation({
    summary: '친구 요청 API',
    description: '친구요청을 보낸다.',
  })
  async addFriend(@getUser() user: UserEntity, @Body('id') friendId: string) {
    await this.usersService.addFriend(user, friendId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me')
  @UsePipes(ValidationPipe)
  @ApiOperation({
    summary: '유저 정보 업데이트 API',
    description: '유저의 정보를 업데이트한다.',
  })
  async updateUserInfo(
    @getUser() user: UserEntity,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserInfo> {
    return this.usersService.updateUserInfo(updateUserDto, user);
  }
}
