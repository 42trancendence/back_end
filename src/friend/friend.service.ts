import { BadRequestException, Injectable } from '@nestjs/common';
import { NotFoundError } from 'rxjs';
import { UserEntity } from 'src/users/entities/user.entity';
import { FriendShipStatus } from './enum/friendShipStatus.enum';
import { FriendShipRepository } from './repository/friendship.repository';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class FriendService {
  constructor(
    private friendShipRepository: FriendShipRepository,
    private usersService: UsersService,
  ) {}

  async getFriendList(user: UserEntity, friendShipStatus: FriendShipStatus) {
    const friendList = await this.friendShipRepository.findWithRelations({
      where: [
        { user: user, status: friendShipStatus },
        { friend: user, status: friendShipStatus },
      ],
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

  async addFriend(user: UserEntity, friendName: string) {
    if (friendName === user.name) {
      throw new BadRequestException('자기 자신을 친구로 추가할 수 없습니다.');
    }
    const friend = await this.usersService.getUserByName(friendName);

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
    const friend = await this.usersService.getUserById(friendId);

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
