import { Injectable } from '@nestjs/common';
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

  async findUserByToken(signupVerifyToken: string): Promise<UserEntity> {
    return await this.findOne({
      where: { signupVerifyToken },
    });
  }

  async findUserById(userId: string): Promise<UserEntity> {
    return await this.findOne({
      where: { id: userId },
    });
  }

  async saveUser(
    id: string,
    name: string,
    signupVerifyToken: string,
    image: string,
  ): Promise<UserEntity> {
    const user = new UserEntity();

    user.id = id;
    user.name = name;
    user.avatarImageUrl = image === undefined ? 'default.img' : image;
    user.registrationDate = new Date();
    user.signupVerifyToken = signupVerifyToken;
    user.isVerified = false;
    await this.save(user);
    return user;
  }

  async saveRefreshToken(token: string, user: UserEntity): Promise<void> {
    user.refreshToken = token;
    this.save(user);
  }
}
