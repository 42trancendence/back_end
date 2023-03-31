import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FriendShipEntity } from '../entities/friendship.entity';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class FriendShipRepository extends Repository<FriendShipEntity> {
  constructor(dataSource: DataSource) {
    super(FriendShipEntity, dataSource.createEntityManager());
  }

  async createFriendShip(user: UserEntity, friend: UserEntity) {
    const friendShip = new FriendShipEntity();

    friendShip.user = user;
    friendShip.friend = friend;
    friendShip.status = 'pending';
    friendShip.isBlock = false;
    this.save(friendShip);
    return friendShip;
  }

  async getFriendShip(user: UserEntity, friend: UserEntity) {
    return await this.findOne({
      where: { user, friend },
    });
  }

  async deleteFriendShip(friendShip: FriendShipEntity) {
    this.delete(friendShip);
  }

  async blockFriendShip(friendShip: FriendShipEntity) {
    friendShip.isBlock = true;
    this.save(friendShip);
  }

  async unblockFriendShip(friendShip: FriendShipEntity) {
    friendShip.isBlock = false;
    this.save(friendShip);
  }
}
