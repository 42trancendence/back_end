import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { DirectMessageEntity } from '../entities/directMessage.entity';

@Injectable()
export class DirectMessageRepository extends Repository<DirectMessageEntity> {
  constructor(dataSource: DataSource) {
    super(DirectMessageEntity, dataSource.createEntityManager());
  }

  async createDirectMessage(
    sender: UserEntity,
    receiver: UserEntity,
  ): Promise<DirectMessageEntity> {
    const directMessage = new DirectMessageEntity();
    directMessage.user1 = sender;
    directMessage.user2 = receiver;
    await this.save(directMessage);
    return directMessage;
  }

  async getDirectMessages(user: UserEntity): Promise<DirectMessageEntity[]> {
    return await this.find({
      where: [{ user1: { id: user.id } }, { user2: { id: user.id } }],
      relations: ['user1', 'user2'],
    });
  }

  async getDirectMessageById(
    directMessageId: string,
  ): Promise<DirectMessageEntity> {
    const dmId = parseInt(directMessageId.substring(2));
    const directMessage = await this.findOne({
      where: { id: dmId },
      relations: ['user1', 'user2'],
    });
    return directMessage;
  }

  async getDirectMessage(
    user1: UserEntity,
    user2: UserEntity,
  ): Promise<DirectMessageEntity> {
    const directMessage = await this.findOne({
      where: [
        { user1: { id: user1.id }, user2: { id: user2.id } },
        { user1: { id: user2.id }, user2: { id: user1.id } },
      ],
      relations: ['user1', 'user2'],
    });
    return directMessage;
  }

  async toggleBlockUser(
    directMessage: DirectMessageEntity,
    user: UserEntity,
  ): Promise<void> {
    if (directMessage.user1.id === user.id) {
      directMessage.isBlockedByUser1 = !directMessage.isBlockedByUser1;
    } else {
      directMessage.isBlockedByUser2 = !directMessage.isBlockedByUser2;
    }
    await this.save(directMessage);
  }
}
