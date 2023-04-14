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
  ApiBadRequestResponse,
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

  // NOTE: GET METHOD

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
    return { message: '사용 가능한 이름입니다.' };
  }

  @Get(':id')
  @ApiOperation({ summary: '유저 정보 조회' })
  @ApiParam({ name: 'id', description: '조회할 유저 ID' })
  @ApiOkResponse({ description: '성공', type: UserInfoDto })
  @ApiNotFoundResponse({ description: '존재하지 않는 유저입니다.' })
  async getUserInfo(@Param('id') userId: string): Promise<UserInfoDto> {
    return await this.usersService.getUserInfo(userId);
  }

  @Get('/')
  @ApiOperation({ summary: '모든 유저 정보 조회' })
  async getAllUserInfo(@getUser() user: UserEntity): Promise<UserInfoDto[]> {
    return await this.usersService.getAllUserInfo(user);
  }

  // NOTE: PUT METHOD
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
    await this.usersService.updateUserInfo(updateUserDto, user);
  }
}
