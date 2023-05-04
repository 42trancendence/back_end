import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repository/user.repository';
import { UserEntity } from './entities/user.entity';
import { FtUserDto } from 'src/auth/dto/ft-user.dto';
import { Status } from './enum/status.enum';
import { GameStatsEntity } from 'src/game/entities/gameStats.entity';

@Injectable()
export class UsersService {
  constructor(private userRepository: UserRepository) {}

  async setTwoFactorAuthSecret(user: UserEntity, secret: string) {
    this.userRepository.saveTwoFactorAuthCode(user, secret);
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

  async getUserByEmail(emailAddress: string): Promise<UserEntity> {
    return await this.userRepository.findUserByEmail(emailAddress);
  }

  async getAllUserExceptMeAndFriend(me: UserEntity): Promise<UserEntity[]> {
    return await this.userRepository.findUserExceptMeAndFriend(me);
  }

  async updateUserInfo(updateUserDto: UpdateUserDto, user: UserEntity) {
    return await this.userRepository.updateUserInfo(updateUserDto, user);
  }

  async getGameHistory(userId: string): Promise<GameStatsEntity[]> {
    const user = await this.userRepository.getGameHistory(userId);

    const combinedGameStats = [
      ...user.gameStatsAsPlayer1,
      ...user.gameStatsAsPlayer2,
    ].sort((a, b) => {
      // 날짜 순으로 정렬 (최근날짜부터)
      return b.createAt.getTime() - a.createAt.getTime();
    });
    return combinedGameStats;
  }
}
