import { BadRequestException, Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
import { FriendShipStatus } from './enum/friendShipStatus.enum';
import { FriendShipRepository } from './repository/friendship.repository';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class FriendService {
  constructor(private friendShipRepository: FriendShipRepository) {}

  async getFriendList(user: UserEntity): Promise<UserEntity[]> {
    const friends = await this.friendShipRepository.findWithRelations({
      where: [
        { user: user, status: FriendShipStatus.ACCEPTED },
        { friend: user, status: FriendShipStatus.ACCEPTED },
      ],
      select: {
        user: {
          id: true,
          name: true,
          avatarImageUrl: true,
          status: true,
        },
        friend: {
          id: true,
          name: true,
          avatarImageUrl: true,
          status: true,
        },
      },
      relations: ['user', 'friend'],
    });

    const friendList = friends.map((friend) => {
      if (friend.user.id === user.id) {
        return friend.friend;
      } else {
        return friend.user;
      }
    });
    return friendList;
  }

  async getFriendRequestList(user: UserEntity): Promise<UserEntity[]> {
    const requestFriends = await this.friendShipRepository.findWithRelations({
      where: { friend: user, status: FriendShipStatus.PENDING },
      select: {
        user: {
          id: true,
          name: true,
          avatarImageUrl: true,
        },
      },
      relations: ['user', 'friend'],
    });
    const requestFriendList = requestFriends.map((friend) => {
      return friend.user;
    });
    return requestFriendList;
  }

  async addFriend(user: UserEntity, friend: UserEntity) {
    if (friend.name === user.name) {
      throw new WsException('자기 자신을 친구로 추가할 수 없습니다.');
    }

    const friendShip = await this.friendShipRepository.findOneWithRelations({
      where: [
        { user: user, friend: friend },
        { user: friend, friend: user },
      ],
      relations: ['user', 'friend'],
    });

    if (friendShip) {
      if (friendShip.status === FriendShipStatus.ACCEPTED) {
        throw new BadRequestException('이미 친구입니다.');
      }
      if (friendShip.user?.id === user.id) {
        throw new BadRequestException('이미 요청을 보냈습니다.');
      }
      throw new BadRequestException('해당 친구로부터 이미 요청을 받았습니다.');
    }
    await this.friendShipRepository.createFriendShip(user, friend);
  }

  async acceptFriendRequest(user: UserEntity, friend: UserEntity) {
    await this.friendShipRepository.setFriendShipStatus(
      user,
      friend,
      FriendShipStatus.ACCEPTED,
    );
  }

  async removeFriendShip(user: UserEntity, friend: UserEntity) {
    await this.friendShipRepository.removeFriendShip(user, friend);
  }

  async isAcceptedFriendShip(user: UserEntity, friend: UserEntity) {
    const friendShip = await this.friendShipRepository.findOneWithRelations({
      where: { user: friend, friend: user },
    });
    if (!friendShip) {
      return false;
    }
    return friendShip.status === FriendShipStatus.ACCEPTED;
  }
}
