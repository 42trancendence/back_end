import { Injectable, NotFoundException } from '@nestjs/common';
import { UserInfo } from './UserInfo';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repository/user.repository';
import { UserEntity } from './entities/user.entity';
import { FtUserDto } from 'src/auth/dto/ft-user.dto';
import { Status } from './enum/status.enum';
import { UserInfoDto } from './dto/user-info.dto';

@Injectable()
export class UsersService {
  constructor(private userRepository: UserRepository) {}

  async setTwoFactorAuthSecret(user: UserEntity, secret: string) {
    this.userRepository.saveTwoFactorAuthCode(user, secret);
  }

  async checkName(name: string): Promise<boolean> {
    const user = await this.userRepository.findUserByName(name);
    return user ? true : false;
  }

  async updateUserStatus(user: UserEntity, status: Status) {
    await this.userRepository.saveUserStatus(user, status);
  }

  async turnOnTwoFactorAuth(user: UserEntity) {
    await this.userRepository.turnOnTwoFactorAuth(user);
  }

  async createUser(ftUser: FtUserDto) {
    return await this.userRepository.saveUser(ftUser);
  }

  async getUserByName(name: string): Promise<UserEntity> {
    return await this.userRepository.findUserByName(name);
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
      throw new NotFoundException('유저가 존재하지 않습니다.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  async getAllUserInfo(me: UserEntity): Promise<UserInfoDto[]> {
    const users = await this.userRepository.find();
    const allUsers = new Array<UserInfoDto>();

    for (const user of users) {
      if (user.id !== me.id) {
        allUsers.push({ id: user.id, name: user.name, email: user.email });
      }
    }
    return allUsers;
  }

  async updateUserInfo(updateUserDto: UpdateUserDto, user: UserEntity) {
    const { name, avatarImageUrl } = updateUserDto;
    user.name = name;
    user.avatarImageUrl = avatarImageUrl;
    await this.userRepository.save(user);
  }
}
