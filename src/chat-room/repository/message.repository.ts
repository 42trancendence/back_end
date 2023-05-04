import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MessageEntity } from '../entities/message.entity';

@Injectable()
export class MessageRepository extends Repository<MessageEntity> {
  constructor(dataSource: DataSource) {
    super(MessageEntity, dataSource.createEntityManager());
  }

  async saveMessage(message: MessageEntity) {
    this.save(message);
  }

  async getChatRoomMessages(chatRoomId: number): Promise<MessageEntity[]> {
    return await this.find({
      where: { chatRoom: { id: chatRoomId } },
      select: {
        user: {
          name: true,
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
        },
      },
      relations: ['user'],
    });
  }
}
