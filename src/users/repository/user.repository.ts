import { Injectable } from '@nestjs/common';
import { FtUserDto } from 'src/auth/dto/ft-user.dto';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { Status } from '../enum/status.enum';
import { Not } from 'typeorm';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UserRepository extends Repository<UserEntity> {
  constructor(dataSource: DataSource) {
    super(UserEntity, dataSource.createEntityManager());
  }

  async findUserExceptMeAndFriend(me: UserEntity): Promise<UserEntity[]> {
    return await this.findBy({
      id: Not(me.id),
    });
  }
  async findUserByEmail(emailAddress: string): Promise<UserEntity> {
    return await this.findOne({
      where: { email: emailAddress },
    });
  }

  async findUserById(userId: string): Promise<UserEntity> {
    const user = await this.findOne({
      where: { id: userId },
    });

    return user;
  }

  async findUserByName(name: string): Promise<UserEntity> {
    return await this.findOne({
      where: { name: name },
    });
  }

  async saveUser(ftUser: FtUserDto): Promise<UserEntity> {
    const user = new UserEntity();

    user.id = ftUser.id;
    user.name = ftUser.name;
    user.email = ftUser.email;
    user.avatarImageUrl = ftUser.avatarImageUrl;
    user.registrationDate = new Date();
    user.rating = 1000;
    await this.save(user);
    return user;
  }

  async saveTwoFactorAuthCode(
    user: UserEntity,
    secret: string,
    type: string,
  ): Promise<void> {
    if (type === 'EMAIL') {
      user.emailAuthCode = secret;
    } else {
      user.qrAuthCode = secret;
    }
    await this.save(user);
  }

  async turnOnTwoFactorAuth(user: UserEntity): Promise<void> {
    user.isTwoFactorEnable = true;
    await this.save(user);
  }

  async saveUserStatus(user: UserEntity, status: Status): Promise<void> {
    user.status = status;
    await this.save(user);
  }

  async updateUserInfo(
    updateUserDto: UpdateUserDto,
    user: UserEntity,
    newAvatarImageUrl: string,
  ) {
    user.name = updateUserDto.name ? updateUserDto.name : user.name;
    user.avatarImageUrl = newAvatarImageUrl
      ? newAvatarImageUrl
      : user.avatarImageUrl;
    await this.save(user);
  }

  async update2FA(user: UserEntity) {
    user.isTwoFactorEnable = !user.isTwoFactorEnable;
    await this.save(user);
  }

  async getUserHistoryByUserId(userId: string): Promise<UserEntity> {
    const user = await this.findOne({
      where: { id: userId },
      relations: ['gameStatsAsPlayer1', 'gameStatsAsPlayer2'],
    });
    return user;
  }

  async updateUserRating(player: UserEntity) {
    await this.save(player);
  }
}
