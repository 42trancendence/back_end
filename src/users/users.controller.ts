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
  @UseGuards(AuthGuard('access-jwt'))
  @ApiOperation({
    summary: '내 정보 API',
    description: '내 정보를 얻는다.',
  })
  async getMyInfo(@getUser() user: UserEntity): Promise<UserInfoDto> {
    return { id: user.id, name: user.name, email: user.email };
  }

  @Get('name')
  @ApiOperation({
    summary: '이름 중복 확인 API',
    description: '이름 중복 확인을 한다.',
  })
  async checkName(@Query('userName') name: string) {
    const IsExist = await this.usersService.checkName(name);
    console.log(IsExist);

    if (IsExist) {
      throw new NotFoundException('이미 존재하는 이름입니다.');
    }
    return { message: '사용 가능한 이름입니다.' };
  }

  @Get('friends')
  @UseGuards(AuthGuard('access-jwt'))
  @ApiOperation({
    summary: '나의 모든 친구 정보 API',
    description: '나의 모든 친구 정보를 얻는다.',
  })
  async getMyFriends(@getUser() user: UserEntity) {
    return await this.usersService.getFriendList(user);
    // return user.friendships;
    // const friends = user.friendships;
    // const friendList = [];
    //
    // for (const friend of friends) {
    //   friendList.push({
    //     id: friend.id,
    //     // name: friend.name,
    //     // email: friend.email,
    //   });
    // }
    // return friendList;
  }

  @Get('friends/:id')
  @UseGuards(AuthGuard('access-jwt'))
  @ApiOperation({
    summary: '나의 친구 정보 API',
    description: '나의 친구 정보를 얻는다.',
  })
  async getMyFriend(
    @getUser() user: UserEntity,
    @Query('id') friendId: string,
  ) {
    return await this.usersService.getFriends(user, friendId);
  }

  @Get('accept/:id')
  @UseGuards(AuthGuard('access-jwt'))
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
  @UseGuards(AuthGuard('access-jwt'))
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
  @UseGuards(AuthGuard('access-jwt'))
  @ApiOperation({
    summary: '유저 정보 API',
    description: '유저의 정보를 얻는다.',
  })
  async getUserInfo(@Param('id') userId: string): Promise<UserInfoDto> {
    return this.usersService.getUserInfo(userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('access-jwt'))
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

  @Post('friend')
  @UseGuards(AuthGuard('access-jwt'))
  @ApiOperation({
    summary: '친구 요청 API',
    description: '친구요청을 보낸다.',
  })
  async addFriend(@getUser() user: UserEntity, @Body('id') friendId: string) {
    await this.usersService.addFriend(user, friendId);
  }

  @Put('me')
  @UseGuards(AuthGuard('access-jwt'))
  @UsePipes(ValidationPipe)
  @ApiOperation({
    summary: '유저 정보 업데이트 API',
    description: '유저의 정보를 업데이트한다.',
  })
  async updateUserInfo(
    @getUser() user: UserEntity,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    await this.usersService.updateUserInfo(updateUserDto, user);
  }
}
