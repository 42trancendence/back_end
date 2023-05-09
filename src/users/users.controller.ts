import {
  Controller,
  Get,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Put,
  Query,
  NotFoundException,
  UseInterceptors,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import { UsersService } from './users.service';
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
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity';
import { getUser } from 'src/auth/decorator/get-user.decorator';
import { CheckUserNameDto } from './dto/check-user-name.dto';
import { GameStatsEntity } from 'src/game/entities/gameStats.entity';

@Controller('users')
@UseGuards(AuthGuard('access-jwt'))
@ApiTags('User API')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Invalid access token' })
export class UsersController {
  constructor(private usersService: UsersService) {}

  private readonly logger = new Logger(UsersController.name);

  //
  // NOTE: GET METHOD
  //

  @Get('me')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiOkResponse({ description: '성공', type: UserEntity })
  async getMyInfo(@getUser() user: UserEntity): Promise<UserEntity> {
    // async getMyInfo(): Promise<UserEntity> {
    this.logger.log('GET users/me');
    return user;
    // return this.usersService.getGameHistory(user.id);
  }

  @Get('game-history')
  @ApiOperation({ summary: '내 게임 기록 조회' })
  @ApiOkResponse({ description: '성공', type: [UserEntity] })
  async getMyGameHistory(
    @getUser() user: UserEntity,
  ): Promise<GameStatsEntity[]> {
    this.logger.log('GET users/game-history');
    return this.usersService.getGameHistory(user.id);
  }

  @Get('name')
  @ApiOperation({ summary: '이름 중복 확인' })
  @ApiQuery({ name: 'userName', description: '중복 확인할 이름' })
  @ApiOkResponse({ description: '성공' })
  @ApiNotFoundResponse({ description: '이미 존재하는 이름입니다.' })
  @UsePipes(ValidationPipe)
  async checkName(
    @getUser() user: UserEntity,
    @Query() checkUserNameDto: CheckUserNameDto,
  ) {
    this.logger.log('GET users/name');
    const foundUser = await this.usersService.getUserByName(
      checkUserNameDto.userName,
    );
    if (foundUser && foundUser.id !== user.id) {
      throw new NotFoundException('이미 존재하는 이름입니다.');
    }
    return { message: '사용 가능한 이름입니다.' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID로 유저 조회' })
  @ApiParam({ name: 'id', description: '조회할 유저 ID' })
  @ApiOkResponse({ description: '성공', type: UserEntity })
  @ApiNotFoundResponse({ description: '존재하지 않는 유저입니다.' })
  async getUserInfo(@Param('id') userId: string): Promise<UserEntity> {
    this.logger.log('GET users/:id');
    return await this.usersService.getUserById(userId);
  }

  @Get('/')
  @ApiOperation({ summary: '나와 나의 친구를 제외한 모든 유저 정보 조회' })
  @ApiOkResponse({ description: '성공', type: Array<UserEntity> })
  async getAllUserInfo(@getUser() user: UserEntity): Promise<UserEntity[]> {
    this.logger.log('GET users/');
    return await this.usersService.getAllUserExceptMeAndFriend(user);
  }

  //
  // NOTE: PUT METHOD
  //

  @Put('me')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: '유저 정보 수정' })
  @ApiBody({ type: UpdateUserDto })
  @ApiBadRequestResponse({
    description: '잘못된 유저이름 또는 아바타 이미지입니다.',
  })
  async updateUserInfo(
    @getUser() user: UserEntity,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.logger.log('PUT users/me');
    await this.usersService.updateUserInfo(updateUserDto, user);
  }

  @Put('me/2fa')
  async update2FA(@getUser() user: UserEntity) {
    this.logger.log('PUT users/me/2fa');
    await this.usersService.update2FA(user);
    return { is2FAEnabled: user.isVerified };
  }
}
