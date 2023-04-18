import { Injectable } from '@nestjs/common';
import {
  DataSource,
  FindManyOptions,
  FindOneOptions,
  Repository,
} from 'typeorm';
import { FriendShipEntity } from '../entities/friendship.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { FriendShipStatus } from '../enum/friendShipStatus.enum';

@Injectable()
export class FriendShipRepository extends Repository<FriendShipEntity> {
  constructor(dataSource: DataSource) {
    super(FriendShipEntity, dataSource.createEntityManager());
  }

  async createFriendShip(user: UserEntity, friend: UserEntity) {
    const friendShip = new FriendShipEntity();

    friendShip.user = user;
    friendShip.friend = friend;
    friendShip.status = FriendShipStatus.PENDING;
    await this.save(friendShip);
    return friendShip;
  }

  async getFriendShip(user: UserEntity, friend: UserEntity) {
    return await this.findOne({
      where: { user, friend },
    });
  }

  async deleteFriendShip(friendShip: FriendShipEntity) {
    await this.remove(friendShip);
  }

  async removeFriendShip(user: UserEntity, friend: UserEntity) {
    const friendShip = await this.findOne({
      where: [
        { user: user, friend: friend },
        { user: friend, friend: user },
      ],
    });
    await this.remove(friendShip);
  }

  async findWithRelations(relations: FindManyOptions) {
    return await this.find(relations);
  }

  async findOneWithRelations(relations: FindOneOptions) {
    return await this.findOne(relations);
  }

  async setFriendShipStatus(
    user: UserEntity,
    friend: UserEntity,
    status: FriendShipStatus,
  ) {
    const friendShip = await this.getFriendShip(friend, user);
    friendShip.status = status;
    await this.save(friendShip);
    return friendShip;
  }
}
