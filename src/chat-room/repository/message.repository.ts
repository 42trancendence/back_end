import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { ChatRoomEntity } from '../entities/chatRoom.entity';
import { DirectMessageEntity } from '../entities/directMessage.entity';
import { MessageEntity } from '../entities/message.entity';

@Injectable()
export class MessageRepository extends Repository<MessageEntity> {
  constructor(dataSource: DataSource) {
    super(MessageEntity, dataSource.createEntityManager());
  }

  async saveMessage(
    user: UserEntity,
    payload: string,
    chatRoom: ChatRoomEntity,
  ): Promise<any> {
    const message = new MessageEntity();
    message.user = user;
    message.message = payload;
    message.chatRoom = chatRoom;
    message.directMessage = null;

    await this.save(message);
    return {
      user: {
        id: user.id,
        name: user.name,
        avatarImageUrl: user.avatarImageUrl,
      },
      message: payload,
      timestamp: message.timestamp,
    };
  }

  async saveDmMessage(
    user: UserEntity,
    payload: string,
    directMessage: DirectMessageEntity,
  ): Promise<any> {
    const message = new MessageEntity();
    message.user = user;
    message.message = payload;
    message.chatRoom = null;
    message.directMessage = directMessage;

    await this.save(message);
    return {
      user: {
        name: user.name,
        avatarImageUrl: user.avatarImageUrl,
      },
      directMessage: {
        id: directMessage.id,
      },
      message: payload,
      timestamp: message.timestamp,
    };
  }

  async getChatRoomMessages(chatRoomId: number): Promise<MessageEntity[]> {
    return await this.find({
      where: { chatRoom: { id: chatRoomId } },
      select: {
        user: {
          name: true,
          avatarImageUrl: true,
        },
      },
      relations: ['user'],
    });
  }

  async getDmMessages(dmId: number): Promise<MessageEntity[]> {
    return await this.find({
      where: { directMessage: { id: dmId } },
      select: {
        user: {
          name: true,
          avatarImageUrl: true,
        },
      },
      relations: ['user'],
    });
  }
}
