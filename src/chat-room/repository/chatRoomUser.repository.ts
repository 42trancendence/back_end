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
  ): Promise<void> {
    const chatRoomUser = new ChatRoomUserEntity();
    chatRoomUser.chatRoom = chatRoom;
    chatRoomUser.user = user;
    chatRoomUser.role = role;
    await this.save(chatRoomUser);
  }

  async getChatRoomUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<ChatRoomUserEntity> {
    return await this.findOne({ where: { user: { id: user.id }, chatRoom } });
  }

  async getChatRoomUsers(
    chatRoom: ChatRoomEntity,
  ): Promise<ChatRoomUserEntity[]> {
    return await this.find({ where: { chatRoom, isBanned: false } });
  }

  async setMuteUser(
    chatRoomUser: ChatRoomUserEntity,
    isMuted: boolean,
  ): Promise<void> {
    chatRoomUser.isMuted = isMuted;
    chatRoomUser.mutedUntil = null;
    if (isMuted) {
      chatRoomUser.mutedUntil = new Date();
    }
    await this.save(chatRoomUser);
  }

  async setUserRole(chatRoomUser: ChatRoomUserEntity, role: ChatRoomRole) {
    chatRoomUser.role = role;
    await this.save(chatRoomUser);
  }

  async toggleBanUser(chatRoomUser: ChatRoomUserEntity): Promise<boolean> {
    if (chatRoomUser.isBanned === false) {
      chatRoomUser.isBanned = !chatRoomUser.isBanned;
      await this.save(chatRoomUser);
      return chatRoomUser.isBanned;
    }
    await this.delete(chatRoomUser);
    return false;
  }

  async deleteChatRoomUser(chatRoomUser: ChatRoomUserEntity): Promise<void> {
    await this.delete({ id: chatRoomUser.id });
  }
}
