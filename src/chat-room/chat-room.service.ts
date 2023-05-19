import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
import { ChatRoomRepository } from './repository/chat-room.repository';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UpdateChatRoomDto } from './dto/update-chat-room.dto';
import { ChatRoomEntity } from './entities/chatRoom.entity';
import { MessageRepository } from './repository/message.repository';
import { WsException } from '@nestjs/websockets';
import { ChatRoomUserRepository } from './repository/chatRoomUser.repository';
import { ChatRoomRole } from './enum/chat-room-role.enum';
import { ChatRoomUserEntity } from './entities/chatRoomUser.entity';
import { Socket } from 'socket.io';
import { ErrorStatus } from './enum/error-status.enum';

@Injectable()
export class ChatRoomService {
  constructor(
    private chatRoomRepository: ChatRoomRepository,
    private messageRepository: MessageRepository,

    private chatRoomUserRepository: ChatRoomUserRepository,
  ) {}

  async createChatRoom(
    createChatRoomDto: CreateChatRoomDto,
  ): Promise<ChatRoomEntity> {
    const chatRoom = await this.chatRoomRepository.createNewChatRoom(
      createChatRoomDto,
    );
    return chatRoom;
  }

  async createChatRoomUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
    role: ChatRoomRole,
  ): Promise<ChatRoomUserEntity> {
    const chatRoomUser = await this.chatRoomUserRepository.getChatRoomUser(
      chatRoom,
      user,
    );
    if (chatRoomUser) {
      if (chatRoomUser.isBanned) {
        throw new WsException({
          status: ErrorStatus.WARNING,
          message: '해당 채팅방에서 차단당한 유저입니다.',
        });
      }
      return chatRoomUser;
    }
    return await this.chatRoomUserRepository.createChatRoomUser(
      chatRoom,
      user,
      role,
    );
  }

  async getChatRoomUser(chatRoom: ChatRoomEntity, user: UserEntity) {
    return await this.chatRoomUserRepository.getChatRoomUser(chatRoom, user);
  }

  async getChatRoomUsers(
    chatRoom: ChatRoomEntity,
  ): Promise<ChatRoomUserEntity[]> {
    return await this.chatRoomUserRepository.getChatRoomUsers(chatRoom);
  }

  async getChatRoomUsersExceptBanned(chatRoom: ChatRoomEntity) {
    return await this.chatRoomUserRepository.getChatRoomUsersExceptBanned(
      chatRoom,
    );
  }

  async toggleBanUser(chatRoomUser: ChatRoomUserEntity): Promise<void> {
    chatRoomUser.isBanned = !chatRoomUser.isBanned;
    return await this.chatRoomUserRepository.saveChatRoomUser(chatRoomUser);
  }

  async setUserRole(
    chatRoomUser: ChatRoomUserEntity,
    chatRoomRole: ChatRoomRole,
  ): Promise<void> {
    chatRoomUser.role = chatRoomRole;
    if (chatRoomRole <= ChatRoomRole.ADMIN) {
      chatRoomUser.isMuted = false;
      chatRoomUser.mutedUntil = null;
    }
    await this.chatRoomUserRepository.saveChatRoomUser(chatRoomUser);
  }

  async setMuteUser(
    chatRoomUser: ChatRoomUserEntity,
    isMuted: boolean,
  ): Promise<void> {
    const now = new Date();
    if (chatRoomUser.isMuted && isMuted) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '이미 MUTE된 유저입니다.',
      });
    }
    chatRoomUser.isMuted = isMuted;
    chatRoomUser.mutedUntil = null;
    if (isMuted) {
      chatRoomUser.mutedUntil = new Date(now.getTime() + 1000 * 60 * 5);
    }
    await this.chatRoomUserRepository.saveChatRoomUser(chatRoomUser);
  }

  async setKickUser(chatRoomUser: ChatRoomUserEntity): Promise<void> {
    await this.chatRoomUserRepository.deleteChatRoomUser(chatRoomUser);
  }

  async getAllChatRooms(): Promise<ChatRoomEntity[]> {
    return await this.chatRoomRepository.getAllChatRooms();
  }

  async getMyChatRooms(user: UserEntity): Promise<any[]> {
    return await this.chatRoomUserRepository.getMyChatRooms(user);
  }

  async getChatRoomById(chatRoomId: string): Promise<ChatRoomEntity> {
    return await this.chatRoomRepository.getChatRoomById(chatRoomId);
  }

  async getChatRoomByName(chatRoomName: string): Promise<ChatRoomEntity> {
    return await this.chatRoomRepository.getChatRoomByName(chatRoomName);
  }

  async saveMessage(
    user: UserEntity,
    chatRoom: ChatRoomEntity,
    chatRoomUser: ChatRoomUserEntity,
    payload: string,
  ): Promise<any> {
    if (!payload || payload.length >= 1000) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '메세지가 비어있거나 너무 큽니다.',
      });
    }
    if (chatRoomUser.isMuted) {
      const now = new Date();
      if (now.getTime() <= chatRoomUser?.mutedUntil.getTime()) {
        throw new WsException({
          status: ErrorStatus.WARNING,
          message: '관리자에 의해 mute 되었습니다.',
        });
      }
      await this.setMuteUser(chatRoomUser, false);
    }

    return await this.messageRepository.saveMessage(user, payload, chatRoom);
  }

  async isUserInChatRoom(client: Socket): Promise<boolean> {
    const sockets = await client.to(client.data.chatRoomId).fetchSockets();
    for (const socket of sockets) {
      if (socket.data?.user?.id === client.data.user.id) {
        return true;
      }
    }
    return false;
  }

  async deleteChatRoom(chatRoom: ChatRoomEntity) {
    await this.chatRoomRepository.deleteChatRoom(chatRoom);
  }

  async saveChatRoomUserIsEntered(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
    isEntered: boolean,
  ) {
    const chatRoomUser = await this.chatRoomUserRepository.getChatRoomUser(
      chatRoom,
      user,
    );
    if (!chatRoomUser) {
      return;
    }
    chatRoomUser.isEntered = isEntered;
    await this.chatRoomUserRepository.saveChatRoomUser(chatRoomUser);
  }

  async deleteChatRoomUser(chatRoom: ChatRoomEntity, user: UserEntity) {
    const chatRoomUser = await this.chatRoomUserRepository.getChatRoomUser(
      chatRoom,
      user,
    );
    if (!chatRoomUser) {
      return;
    }
    if (chatRoomUser.isBanned === true) {
      return;
    }
    await this.chatRoomUserRepository.deleteChatRoomUser(chatRoomUser);
    const chatRoomUsers = await this.getChatRoomUsersExceptBanned(chatRoom);

    // NOTE: 만약 나가는 유저가 그방의 마지막 유저면 방을 삭제해야함
    if (chatRoomUsers.length === 0) {
      await this.deleteChatRoom(chatRoom);
      return;
    }

    // NOTE: 만약 나가는 유저가 방장이라면 방장을 위임해야함
    const nextOwner = await this.chatRoomUserRepository.getChatRoomUser(
      chatRoom,
      chatRoomUsers[0].user,
    );
    if (chatRoomUser.role === ChatRoomRole.OWNER) {
      await this.setUserRole(nextOwner, ChatRoomRole.OWNER);
    }
  }

  async getMessages(chatRoom: ChatRoomEntity) {
    return await this.messageRepository.getChatRoomMessages(chatRoom.id);
  }

  async updateChatRoom(
    chatRoom: ChatRoomEntity,
    updateChatRoomDto: UpdateChatRoomDto,
  ) {
    chatRoom.type = updateChatRoomDto.type;
    chatRoom.password = updateChatRoomDto.password;
    await this.chatRoomRepository.save(chatRoom);
  }
}
