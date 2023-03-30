import {
  Controller,
  Get,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Put,
  Post,
  Delete,
  Query,
  NotFoundException,
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
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '내 정보 API',
    description: '내 정보를 얻는다.',
  })
  async getMyInfo(@getUser() user: UserEntity): Promise<UserInfoDto> {
    console.log(user);
    return { id: user.id, name: user.name, email: user.email };
  }

  @Get('name')
  @ApiOperation({
    summary: '이름 중복 확인 API',
    description: '이름 중복 확인을 한다.',
  })
  async checkName(@Query('userName') name: string) {
    const IsExist = await this.usersService.checkName(name);

    if (IsExist) {
      throw new NotFoundException('이미 존재하는 이름입니다.');
    }
    return { message: '사용 가능한 이름입니다.' };
  }

  @Get('friends')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '나의 모든 친구 정보 API',
    description: '나의 모든 친구 정보를 얻는다.',
  })
  async getMyFriends(@getUser() user: UserEntity): Promise<UserInfoDto[]> {
    const friends = user.friendships;
    const friendList = [];

    for (const friend of friends) {
      friendList.push({
        id: friend.id,
        name: friend.name,
        email: friend.email,
      });
    }
    return friendList;
  }

  @Get('friends/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '나의 친구 정보 API',
    description: '나의 친구 정보를 얻는다.',
  })
  async getMyFriend(
    @getUser() user: UserEntity,
    @Query('id') friendId: string,
  ): Promise<UserInfoDto> {
    const friends = user.friendships;

    for (const friend of friends) {
      if (friend.id === friendId)
        return { id: friend.id, name: friend.name, email: friend.email };
    }
    throw new NotFoundException('친구가 존재하지 않습니다.');
  }

  @Get('accept/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '친구 요청 수락API',
    description: '친구요청을 수락한다.',
  })
  async acceptFriend(
    @getUser() user: UserEntity,
    @Query('id') friendId: string,
  ) {
    // TODO: 친구 요청 수락 API
    // await this.usersService.acceptFriend(user, friendId);
  }

  @Get('reject/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '친구 요청 거절API',
    description: '친구요청을 거절한다.',
  })
  async rejectFriend(
    @getUser() user: UserEntity,
    @Query('id') friendId: string,
  ) {
    // TODO: 친구 요청 거절 API
    // await this.usersService.acceptFriend(user, friendId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: '유저 정보 API',
    description: '유저의 정보를 얻는다.',
  })
  async getUserInfo(@Param('id') userId: string): Promise<UserInfoDto> {
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
  ): Promise<UserInfoDto> {
    return this.usersService.updateUserInfo(updateUserDto, user);
  }
}
