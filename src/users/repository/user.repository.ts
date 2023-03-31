import { Injectable } from '@nestjs/common';
import { FtUserDto } from 'src/auth/dto/ft-user.dto';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository extends Repository<UserEntity> {
  constructor(dataSource: DataSource) {
    super(UserEntity, dataSource.createEntityManager());
  }

  async findUserByEmail(emailAddress: string): Promise<UserEntity> {
    return await this.findOne({
      where: { email: emailAddress },
    });
  }

  async findUserById(userId: string): Promise<UserEntity> {
    return await this.findOne({
      where: { id: userId },
    });
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
    user.isVerified = false;
    await this.save(user);
    return user;
  }

  async saveRefreshToken(token: string, user: UserEntity): Promise<void> {
    user.refreshToken = token;
    this.save(user);
  }

  async saveTwoFactorAuthCode(user: UserEntity, secret: string): Promise<void> {
    user.twoFactorAuthCode = secret;
    this.save(user);
  }

  async turnOnTwoFactorAuth(user: UserEntity): Promise<void> {
    user.isVerified = true;
    this.save(user);
  }
}
