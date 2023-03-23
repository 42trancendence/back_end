import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { ChatRoomEntity } from './entities/chatRoom.entity';

@Injectable()
export class ChatRoomRepository extends Repository<ChatRoomEntity> {
  constructor(dataSource: DataSource) {
    super(ChatRoomEntity, dataSource.createEntityManager());
  }

  async createNewChatRoom(
    createChatRoomDto: CreateChatRoomDto,
    user: UserEntity,
  ) {
    const newChatRoom = new ChatRoomEntity();

    newChatRoom.name = createChatRoomDto.name;
    newChatRoom.description = createChatRoomDto.description;
    newChatRoom.isPrivate = createChatRoomDto.isPrivate;
    newChatRoom.owner = user;
    newChatRoom.password = createChatRoomDto.password;
    await this.save(newChatRoom);
  }

  async getAllChatRooms(): Promise<ChatRoomEntity[]> {
    return await this.find();
  }

  async getChatRoom(chatRoomId: number): Promise<ChatRoomEntity> {
    return await this.findOne({ where: { id: chatRoomId } });
  }

  async getChatRoomByName(chatRoomName: string): Promise<ChatRoomEntity> {
    return await this.findOne({ where: { name: chatRoomName } });
  }
}
