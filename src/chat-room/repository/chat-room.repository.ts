import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreateChatRoomDto } from '../dto/create-chat-room.dto';
import { ChatRoomEntity } from '../entities/chatRoom.entity';
import { ChatRoomType } from '../enum/chat-room-type.enum';

@Injectable()
export class ChatRoomRepository extends Repository<ChatRoomEntity> {
  constructor(dataSource: DataSource) {
    super(ChatRoomEntity, dataSource.createEntityManager());
  }

  async createNewChatRoom(
    createChatRoomDto: CreateChatRoomDto,
  ): Promise<ChatRoomEntity> {
    const newChatRoom = new ChatRoomEntity();

    newChatRoom.name = createChatRoomDto.name;
    newChatRoom.type = createChatRoomDto.type;
    newChatRoom.password = createChatRoomDto.password;
    await this.save(newChatRoom);
    return newChatRoom;
  }

  async getAllChatRooms(): Promise<ChatRoomEntity[]> {
    return await this.find({
      where: [
        { type: ChatRoomType.PUBLIC, users: { isBanned: false } },
        { type: ChatRoomType.PROTECTED, users: { isBanned: false } },
      ],
      select: {
        id: true,
        name: true,
        type: true,
        users: {
          id: true,
        },
      },
      relations: ['users'],
    });
  }

  async getChatRoomById(chatRoomId: string): Promise<ChatRoomEntity> {
    const id = parseInt(chatRoomId);
    return await this.findOne({ where: { id: id } });
  }

  async getChatRoomByName(chatRoomName: string): Promise<ChatRoomEntity> {
    return await this.findOne({ where: { name: chatRoomName } });
  }

  async deleteChatRoom(chatRoom: ChatRoomEntity): Promise<void> {
    await this.delete({ id: chatRoom.id });
  }
}
