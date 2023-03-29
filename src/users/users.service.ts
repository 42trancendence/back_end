import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserInfo } from './UserInfo';
import { NotFoundError } from 'rxjs';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repository/user.repository';
import { UserEntity } from './entities/user.entity';
import { FtUserDto } from 'src/auth/dto/ft-user.dto';

@Injectable()
export class UsersService {
  constructor(private userRepository: UserRepository) {}

  async setTwoFactorAuthSecret(user: UserEntity, secret: string) {
    this.userRepository.saveTwoFactorAuthCode(user, secret);
  }

  async turnOnTwoFactorAuth(user: UserEntity) {
    await this.userRepository.turnOnTwoFactorAuth(user);
  }

  async createUser(ftUser: FtUserDto) {
    return await this.userRepository.saveUser(ftUser);
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

  //TODO: entity에서 해결할 수 있는 부분인지 확인
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
    updateUserDto: UpdateUserDto,
    user: UserEntity,
  ): Promise<UserInfo> {
    const { name, avatarImageUrl } = updateUserDto;
    user.name = name;
    user.avatarImageUrl = avatarImageUrl;
    await this.userRepository.save(user);

    return await this.getUserInfo(user.id);
  }
}
