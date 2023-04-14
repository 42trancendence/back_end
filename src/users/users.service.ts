import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserInfo } from './UserInfo';
import { NotFoundError } from 'rxjs';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repository/user.repository';
import { UserEntity } from './entities/user.entity';
import { FtUserDto } from 'src/auth/dto/ft-user.dto';
import { FriendShipRepository } from './repository/friendship.repository';
import { Status } from './enum/status.enum';
import { FriendShipStatus } from './enum/friendShipStatus.enum';
import { UserInfoDto } from './dto/user-info.dto';

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

  async updateUserStatus(user: UserEntity, status: Status) {
    await this.userRepository.saveUserStatus(user, status);
  }

  async turnOnTwoFactorAuth(user: UserEntity) {
    await this.userRepository.turnOnTwoFactorAuth(user);
  }

  async createUser(ftUser: FtUserDto) {
    return await this.userRepository.saveUser(ftUser);
  }

  async getFriendList(user: UserEntity, friendShipStatus: FriendShipStatus) {
    console.log('status', friendShipStatus);
    const friendList = await this.friendShipRepository.findWithRelations({
      where: [
        { user: user, status: friendShipStatus },
        { friend: user, status: friendShipStatus },
      ],
      relations: ['user', 'friend'],
    });
    console.log('friendList', friendList);

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

  async addFriend(user: UserEntity, friendName: string) {
    if (friendName === user.name) {
      throw new BadRequestException('자기 자신을 친구로 추가할 수 없습니다.');
    }
    const friend = await this.getUserByName(friendName);

    if (!friend) {
      throw new NotFoundError('친구가 존재하지 않습니다.');
    }

    const friendShip = await this.friendShipRepository.getFriendShip(
      user,
      friend,
    );
    if (friendShip) {
      throw new BadRequestException('이미 친구요청을 보냈습니다.');
    }
    await this.friendShipRepository.createFriendShip(user, friend);
  }

  async getUserByName(name: string): Promise<UserEntity> {
    return await this.userRepository.findUserByName(name);
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

  async acceptFriendRequest(user: UserEntity, friend: UserEntity) {
    await this.friendShipRepository.setFriendShipStatus(
      user,
      friend,
      FriendShipStatus.ACCEPTED,
    );
  }

  async rejectFriendRequest(user: UserEntity, friend: UserEntity) {
    await this.friendShipRepository.removeFriendShip(user, friend);
  }

  async setFriendShipStatus(
    user: UserEntity,
    friendId: string,
    status: FriendShipStatus,
  ) {
    const friend = await this.getUserById(friendId);

    await this.friendShipRepository.setFriendShipStatus(user, friend, status);
  }

  async getFriendRequestList(user: UserEntity) {
    const friendList = await this.friendShipRepository.findWithRelations({
      where: [{ friend: user, status: FriendShipStatus.PENDING }],
      relations: ['user', 'friend'],
    });

    const friends = friendList.map((friend) => {
      const { id, name, email } = friend.user;
      return {
        id,
        name,
        email,
      };
    });
    return friends;
  }
}
