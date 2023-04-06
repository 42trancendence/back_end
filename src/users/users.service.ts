import { Injectable } from '@nestjs/common';
import { UserInfo } from './UserInfo';
import { NotFoundError } from 'rxjs';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repository/user.repository';
import { UserEntity } from './entities/user.entity';
import { FtUserDto } from 'src/auth/dto/ft-user.dto';
import { FriendShipRepository } from './repository/friendship.repository';

@Injectable()
export class UsersService {
  constructor(
    private userRepository: UserRepository,
    private friendShipRepository: FriendShipRepository,
  ) {}

  async setTwoFactorAuthSecret(user: UserEntity, secret: string) {
    this.userRepository.saveTwoFactorAuthCode(user, secret);
  }

  async checkName(name: string): Promise<boolean> {
    const user = await this.userRepository.findUserByName(name);
    return user ? true : false;
  }

  async turnOnTwoFactorAuth(user: UserEntity) {
    await this.userRepository.turnOnTwoFactorAuth(user);
  }

  async createUser(ftUser: FtUserDto) {
    return await this.userRepository.saveUser(ftUser);
  }

  async getFriendList(user: UserEntity) {
    const friendList = await this.friendShipRepository.findWithRelations({
      where: [{ user: user }, { friend: user }],
      relations: ['user', 'friend'],
    });
    const friends = friendList.map((friend) => {
      const isUser = friend.user.id === user.id;
      const friendDetail = isUser ? friend.friend : friend.user;
      const { id, name, email } = friendDetail;
      return {
        id,
        name,
        email,
      };
    });
    return friends;
  }

  async getFriends(user: UserEntity, friendId: string) {
    return await this.friendShipRepository.findWithRelations({
      where: [{ user: user }, { friend: friendId }],
      relations: ['user', 'friend'],
    });
  }

  async addFriend(user: UserEntity, friendId: string) {
    if (friendId === user.id) {
      throw new NotFoundError('자기 자신을 친구로 추가할 수 없습니다.');
    }
    const friend = await this.getUserById(friendId);

    if (!friend) {
      throw new NotFoundError('친구가 존재하지 않습니다.');
    }

    const friendShip = await this.friendShipRepository.getFriendShip(
      user,
      friend,
    );
    if (friendShip) {
      throw new NotFoundError('이미 친구요청을 보냈습니다.');
    }
    await this.friendShipRepository.createFriendShip(user, friend);
  }

  async getFriendById(user: UserEntity, friendId: string) {
    const friend = await this.userRepository.findUserById(friendId);

    if (!friend) {
      throw new NotFoundError('친구가 존재하지 않습니다.');
    }

    const friendShip = await this.friendShipRepository.getFriendShip(
      user,
      friend,
    );
    return friendShip;
  }

  async deleteFriend(user: UserEntity, friendId: string) {
    const friendShip = await this.getFriendById(user, friendId);
    await this.friendShipRepository.deleteFriendShip(friendShip);
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

  async updateUserInfo(updateUserDto: UpdateUserDto, user: UserEntity) {
    const { name, avatarImageUrl } = updateUserDto;
    user.name = name;
    user.avatarImageUrl = avatarImageUrl;
    await this.userRepository.save(user);
  }

  async setFriendShipStatus(
    user: UserEntity,
    friendId: string,
    status: string,
  ) {
    // await this.userRepository.setFriendShipStatus(user, friendId, status);
  }
}
