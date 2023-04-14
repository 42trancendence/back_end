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

  async findUserExceptMe(me: UserEntity): Promise<UserEntity[]> {
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

  async saveTwoFactorAuthCode(user: UserEntity, secret: string): Promise<void> {
    await this.update(user.id, { twoFactorAuthCode: secret });
  }

  async turnOnTwoFactorAuth(user: UserEntity): Promise<void> {
    await this.update(user.id, { isVerified: true });
  }

  async saveUserStatus(user: UserEntity, status: Status): Promise<void> {
    await this.update(user.id, { status: status });
  }

  async updateUserInfo(updateUserDto: UpdateUserDto, user: UserEntity) {
    await this.update(user.id, {
      name: updateUserDto.name,
      avatarImageUrl: updateUserDto.avatarImageUrl,
    });
  }
}
