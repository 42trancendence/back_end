import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MessageEntity } from './entities/message.entity';

@Injectable()
export class MessageRepository extends Repository<MessageEntity> {
  constructor(dataSource: DataSource) {
    super(MessageEntity, dataSource.createEntityManager());
  }

  async saveMessage(message: MessageEntity) {
    this.save(message);
  }
}
