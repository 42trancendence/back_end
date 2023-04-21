import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
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
    user: UserEntity,
  ): Promise<ChatRoomEntity> {
    const newChatRoom = new ChatRoomEntity();

    newChatRoom.name = createChatRoomDto.name;
    newChatRoom.type = createChatRoomDto.type;
    newChatRoom.owner = user;
    newChatRoom.password = createChatRoomDto.password;
    await this.save(newChatRoom);
    return newChatRoom;
  }

  async getAllChatRooms(): Promise<ChatRoomEntity[]> {
    return await this.findBy([
      {
        type: ChatRoomType.PRIVATE,
      },
      {
        type: ChatRoomType.PROTECTED,
      },
    ]);
  }

  async getChatRoomById(chatRoomId: string): Promise<ChatRoomEntity> {
    const id = parseInt(chatRoomId);
    return await this.findOne({ where: { id: id } });
  }

  async getChatRoomByName(chatRoomName: string): Promise<ChatRoomEntity> {
    return await this.findOne({ where: { name: chatRoomName } });
  }

  async deleteChatRoom(chatRoom: ChatRoomEntity): Promise<void> {
    await this.remove(chatRoom);
  }

  async toggleBanUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<boolean> {
    if (chatRoom.bannedUsers.includes(user)) {
      const index = chatRoom.bannedUsers.indexOf(user);
      chatRoom.bannedUsers.splice(index, 1);
      await this.save(chatRoom);
      return true;
    }
    chatRoom.bannedUsers.push(user);
    await this.save(chatRoom);
    return false;
  }

  async toggleMuteUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<boolean> {
    if (chatRoom.mutedUsers.includes(user)) {
      const index = chatRoom.bannedUsers.indexOf(user);
      chatRoom.mutedUsers.splice(index, 1);
      await this.save(chatRoom);
      return true;
    }
    chatRoom.mutedUsers.push(user);
    await this.save(chatRoom);
    return false;
  }
}
