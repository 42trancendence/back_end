import { Injectable } from '@nestjs/common';
import { DataSource, FindManyOptions, Repository } from 'typeorm';
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

  async findWithRelations(relations: FindManyOptions) {
    return await this.find(relations);
  }

  async getFriendList(user: UserEntity) {
    return await this.find({
      where: { user },
    });
  }
}
