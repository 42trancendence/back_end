import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { ChatRoomEntity } from '../entities/chatRoom.entity';
import { ChatRoomUserEntity } from '../entities/chatRoomUser.entity';
import { ChatRoomRole } from '../enum/chat-room-role.enum';

@Injectable()
export class ChatRoomUserRepository extends Repository<ChatRoomUserEntity> {
  constructor(dataSource: DataSource) {
    super(ChatRoomUserEntity, dataSource.createEntityManager());
  }

  async createChatRoomUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
    role: ChatRoomRole,
  ): Promise<ChatRoomUserEntity> {
    const chatRoomUser = new ChatRoomUserEntity();
    chatRoomUser.chatRoom = chatRoom;
    chatRoomUser.user = user;
    chatRoomUser.role = role;
    await this.save(chatRoomUser);
    return chatRoomUser;
  }

  async getChatRoomUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<ChatRoomUserEntity> {
    return await this.findOne({
      where: { user: { id: user.id }, chatRoom: { id: chatRoom.id } },
      relations: ['user', 'chatRoom'],
    });
  }

  async getChatRoomUsers(
    chatRoom: ChatRoomEntity,
  ): Promise<ChatRoomUserEntity[]> {
    return await this.find({
      where: { chatRoom: { id: chatRoom.id } },
      select: {
        role: true,
        isBanned: true,
        user: {
          id: true,
          name: true,
        },
      },
      relations: ['user'],
    });
  }

  async getChatRoomUsersExceptBanned(chatRoom: ChatRoomEntity) {
    return await this.find({
      where: { chatRoom: { id: chatRoom.id }, isBanned: false },
      select: {
        role: true,
        isBanned: true,
        user: {
          id: true,
          name: true,
        },
      },
      relations: ['user'],
    });
  }

  async saveChatRoomUser(chatRoomUser: ChatRoomUserEntity): Promise<void> {
    await this.save(chatRoomUser);
  }

  async deleteChatRoomUser(chatRoomUser: ChatRoomUserEntity): Promise<void> {
    await this.delete({ id: chatRoomUser.id });
  }
}
