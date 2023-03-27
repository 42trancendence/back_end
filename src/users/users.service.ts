import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as uuid from 'uuid';
import { UserInfo } from './UserInfo';
import { NotFoundError } from 'rxjs';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repository/user.repository';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private userRepository: UserRepository) {}

  async createUser(id: string, name: string, avatar: string) {
    await this.checkUserExists(id);

    const signupVerifyToken = uuid.v1();

    return await this.userRepository.saveUser(
      id,
      name,
      signupVerifyToken,
      avatar,
    );
  }

  private async checkUserExists(id: string): Promise<void> {
    const user = await this.userRepository.findUserById(id);
    if (user) throw new Error('이미 동일한 소셜 로그인을 사용중입니다.');
  }

  async getUserById(userId: string): Promise<UserEntity> {
    return await this.userRepository.findUserById(userId);
  }
  async getUserByEmail(email: string): Promise<UserEntity> {
    return await this.userRepository.findUserByEmail(email);
  }

  async getUserInfo(userId: string): Promise<UserInfo> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('유저가 존재하지 않습니다.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  async updateUserInfo(
    userId: string,
    updateUserDto: UpdateUserDto,
    userInfo: UserEntity,
  ): Promise<UserInfo> {
    if (userId !== userInfo.id) throw new UnauthorizedException('권한 없음');
    const { avatarImageUrl } = updateUserDto;
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('유저가 존재하지 않습니다.');
    }
    user.avatarImageUrl = avatarImageUrl;
    await this.userRepository.save(user);

    return await this.getUserInfo(userId);
  }
}
