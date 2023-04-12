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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiNotFoundResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity';
import { getUser } from 'src/auth/decorator/get-user.decorator';

@Controller('users')
@UseGuards(AuthGuard('access-jwt'))
@ApiTags('User API')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Invalid access token' })
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiOkResponse({ description: '성공', type: UserInfoDto })
  async getMyInfo(@getUser() user: UserEntity): Promise<UserInfoDto> {
    return { id: user.id, name: user.name, email: user.email };
  }

  @Get('name')
  @ApiOperation({ summary: '이름 중복 확인' })
  @ApiQuery({ name: 'userName', description: '중복 확인할 이름' })
  @ApiOkResponse({ description: '성공' })
  @ApiNotFoundResponse({ description: '이미 존재하는 이름입니다.' })
  async checkName(@Query('userName') name: string) {
    const IsExist = await this.usersService.checkName(name);

    if (IsExist) {
      throw new NotFoundException('이미 존재하는 이름입니다.');
    }
  }

  @Get('friends')
  @ApiOperation({ summary: '나의 모든 친구 정보 조회' })
  @ApiOkResponse({
    description: '나의 모든 친구 정보를 얻는다',
    type: [UserInfoDto],
  })
  async getMyFriends(@getUser() user: UserEntity) {
    return await this.usersService.getFriendList(user);
  }

  @Get('accept/:id')
  @ApiOperation({ summary: '친구 요청 수락' })
  @ApiQuery({ name: 'id', description: '친구 요청을 수락할 유저의 id' })
  async acceptFriend(
    @getUser() user: UserEntity,
    @Query('id') friendId: string,
  ) {
    await this.usersService.setFriendShipStatus(user, friendId, 'accept');
  }

  @Get('reject/:id')
  @ApiOperation({ summary: '친구 요청 거절' })
  async rejectFriend(
    @getUser() user: UserEntity,
    @Query('id') friendId: string,
  ) {
    await this.usersService.setFriendShipStatus(user, friendId, 'reject');
  }

  @Get(':id')
  @ApiOperation({ summary: '유저 정보 조회' })
  @ApiParam({ name: 'id', description: '유저 고유 ID' })
  @ApiOkResponse({ description: '성공', type: UserInfoDto })
  async getUserInfo(@Param('id') userId: string): Promise<UserInfoDto> {
    return this.usersService.getUserInfo(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '친구 삭제' })
  async deleteFriend(
    @getUser() user: UserEntity,
    @Param('id') friendId: string,
  ) {
    await this.usersService.deleteFriend(user, friendId);
  }

  @Post('friend')
  @ApiOperation({ summary: '친구 요청' })
  async addFriend(@getUser() user: UserEntity, @Body('id') friendId: string) {
    await this.usersService.addFriend(user, friendId);
  }

  @Put('me')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: '유저 정보 수정' })
  @ApiBody({ type: UpdateUserDto })
  async updateUserInfo(
    @getUser() user: UserEntity,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    await this.usersService.updateUserInfo(updateUserDto, user);
  }
}
