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
    const directMessages = await this.find({
      where: [{ user1: user }, { user2: user }],
    });
    // const directChats = directMessages.filter((dm) => {
    //   dm.user1 === user || dm.user2 === user;
    // });
    // const directChatRooms = await Promise.all(directChats.map(async (dm) => {
    //   const otherUser = dm.user1 === user ? dm.user2 : dm.user1;
    //   const lastMessage = await this.getLastMessage(dm);
    // }));
    return directMessages;
  }

  async getDirectMessageById(
    directMessageId: string,
  ): Promise<DirectMessageEntity> {
    const dmId = parseInt(directMessageId.substring(2));
    const directMessage = await this.findOne({ where: { id: dmId } });
    return directMessage;
  }

  async getDirectMessage(
    user1: UserEntity,
    user2: UserEntity,
  ): Promise<DirectMessageEntity> {
    const directMessage = await this.findOne({
      where: [
        { user1: user1, user2: user2 },
        { user1: user2, user2: user1 },
      ],
    });
    return directMessage;
  }

  async toggleBlockUser(
    directMessage: DirectMessageEntity,
    user: UserEntity,
  ): Promise<void> {
    if (directMessage.user1 === user) {
      directMessage.isBlockedByUser1 = !directMessage.isBlockedByUser1;
    } else {
      directMessage.isBlockedByUser2 = !directMessage.isBlockedByUser2;
    }
  }
  // async saveMessage(
  //   user: UserEntity,
  //   directMessage: DirectMessageEntity,
  //   payload: string,
  // ): Promise<MessageEntity> {
  //   const message = new MessageEntity();
  //
  //   message.user = user;
  //   message.message = payload;
  //   message.directMessage = directMessage;
  //
  //   await this.messageRepository.saveMessage(message);
  //   return message;
  // }
}
