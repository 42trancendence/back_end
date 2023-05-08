import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
import { ChatRoomRepository } from './repository/chat-room.repository';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UpdateChatRoomDto } from './dto/update-chat-room.dto';
import { ChatRoomEntity } from './entities/chatRoom.entity';
import { MessageEntity } from './entities/message.entity';
import { MessageRepository } from './repository/message.repository';
import { DirectMessageRepository } from './repository/directMessage.repository';
import { DirectMessageEntity } from './entities/directMessage.entity';
import { WsException } from '@nestjs/websockets';
import { ChatRoomUserRepository } from './repository/chatRoomUser.repository';
import { ChatRoomRole } from './enum/chat-room-role.enum';
import { ChatRoomUserEntity } from './entities/chatRoomUser.entity';
import { Socket } from 'socket.io';

@Injectable()
export class ChatRoomService {
  constructor(
    private chatRoomRepository: ChatRoomRepository,
    private directMessageRepository: DirectMessageRepository,
    private messageRepository: MessageRepository,

    private chatRoomUserRepository: ChatRoomUserRepository,
  ) {}

  async createChatRoom(
    createChatRoomDto: CreateChatRoomDto,
    user: UserEntity,
  ): Promise<void> {
    const chatRoom = await this.chatRoomRepository.createNewChatRoom(
      createChatRoomDto,
    );
    await this.createChatRoomUser(chatRoom, user, ChatRoomRole.OWNER);
  }

  async createChatRoomUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
    role: ChatRoomRole,
  ): Promise<void> {
    const chatRoomUser = await this.chatRoomUserRepository.getChatRoomUser(
      chatRoom,
      user,
    );
    if (chatRoomUser) {
      if (chatRoomUser.isBanned) {
        throw new WsException('해당 채팅방에서 차단당한 유저입니다.');
      }
      return;
    }
    await this.chatRoomUserRepository.createChatRoomUser(chatRoom, user, role);
  }

  async getChatRoomUser(chatRoom: ChatRoomEntity, user: UserEntity) {
    return await this.chatRoomUserRepository.getChatRoomUser(chatRoom, user);
  }

  async getChatRoomUsers(
    chatRoom: ChatRoomEntity,
  ): Promise<ChatRoomUserEntity[]> {
    return await this.chatRoomUserRepository.getChatRoomUsers(chatRoom);
  }

  async createDirectMessage(
    sender: UserEntity,
    receiver: UserEntity,
  ): Promise<DirectMessageEntity> {
    const directMessage = await this.directMessageRepository.getDirectMessage(
      sender,
      receiver,
    );

    if (!directMessage) {
      return await this.directMessageRepository.createDirectMessage(
        sender,
        receiver,
      );
    }
    return directMessage;
  }

  async toggleBlockUser(
    directMessage: DirectMessageEntity,
    user: UserEntity,
  ): Promise<void> {
    await this.directMessageRepository.toggleBlockUser(directMessage, user);
  }

  async validationIsNormalUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<ChatRoomUserEntity> {
    const chatRoomUser = await this.chatRoomUserRepository.getChatRoomUser(
      chatRoom,
      user,
    );
    if (!chatRoomUser) {
      throw new WsException('User is not in this chat room');
    }
    if (chatRoomUser.role !== ChatRoomRole.NORMAL) {
      throw new WsException('User is not an normal');
    }
    return chatRoomUser;
  }

  async toggleBanUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<boolean> {
    const chatRoomUser = await this.validationIsNormalUser(chatRoom, user);
    return await this.chatRoomUserRepository.toggleBanUser(chatRoomUser);
  }

  async setAdminUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<void> {
    const chatRoomUser = await this.validationIsNormalUser(chatRoom, user);
    await this.chatRoomUserRepository.setUserRole(
      chatRoomUser,
      ChatRoomRole.ADMIN,
    );
  }

  async setMuteUser(chatRoom: ChatRoomEntity, user: UserEntity): Promise<void> {
    const chatRoomUser = await this.validationIsNormalUser(chatRoom, user);
    await this.chatRoomUserRepository.setMuteUser(chatRoomUser, true);
  }

  async setKickUser(chatRoom: ChatRoomEntity, user: UserEntity): Promise<void> {
    const chatRoomUser = await this.validationIsNormalUser(chatRoom, user);
    await this.chatRoomUserRepository.deleteChatRoomUser(chatRoomUser);
  }

  async getDirectMessage(
    user1: UserEntity,
    user2: UserEntity,
  ): Promise<DirectMessageEntity> {
    return await this.directMessageRepository.getDirectMessage(user1, user2);
  }

  async getDirectMessageById(
    directMessageId: string,
  ): Promise<DirectMessageEntity> {
    return await this.directMessageRepository.getDirectMessageById(
      directMessageId,
    );
  }

  async getDirectMessages(user: UserEntity): Promise<any> {
    const directMessages = await this.directMessageRepository.getDirectMessages(
      user,
    );
    const directChatRooms = await Promise.all(
      directMessages.map(async (dm) => {
        const otherUser = dm.user1.id === user.id ? dm.user2 : dm.user1;
        return {
          id: dm.id,
          otherUserId: otherUser.id,
          otherUserName: otherUser.name,
          otherUserAvatarImageUrl: otherUser.avatarImageUrl,
        };
      }),
    );
    return directChatRooms;
  }

  async getAllChatRooms(): Promise<ChatRoomEntity[]> {
    return await this.chatRoomRepository.getAllChatRooms();
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
    payload: string,
  ): Promise<any> {
    const chatRoomUser = await this.chatRoomUserRepository.getChatRoomUser(
      chatRoom,
      user,
    );
    if (!chatRoomUser) {
      throw new WsException('You are not a member of this chat room');
    }

    if (chatRoomUser.isMuted) {
      const now = new Date();
      // NOTE: 5 minutes
      if (now.getTime() <= chatRoomUser?.mutedUntil.getTime() + 1000 * 60 * 5) {
        throw new WsException('You are muted in this chat room');
      }
      await this.chatRoomUserRepository.setMuteUser(chatRoomUser, false);
    }

    const message = new MessageEntity();
    message.user = user;
    message.message = payload;
    message.chatRoom = chatRoom;
    message.directMessage = null;
    await this.messageRepository.saveMessage(message);
    return {
      user: {
        id: user.id,
        name: user.name,
      },
      message: payload,
      timestamp: message.timestamp,
    };
  }

  async saveDirectMessage(
    user: UserEntity,
    directMessage: DirectMessageEntity,
    payload: string,
  ): Promise<any> {
    if (directMessage.user1.id === user.id && directMessage.isBlockedByUser2) {
      throw new WsException('You are blocked by this user');
    }

    if (directMessage.user2.id === user.id && directMessage.isBlockedByUser1) {
      throw new WsException('You are blocked by this user');
    }

    const message = new MessageEntity();
    message.user = user;
    message.message = payload;
    message.directMessage = directMessage;
    message.chatRoom = null;
    await this.messageRepository.saveMessage(message);
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

  async deleteChatRoomUser(chatRoom: ChatRoomEntity, user: UserEntity) {
    const chatRoomUser = await this.chatRoomUserRepository.getChatRoomUser(
      chatRoom,
      user,
    );
    if (!chatRoomUser) {
      return;
    }
    await this.chatRoomUserRepository.deleteChatRoomUser(chatRoomUser);
    const chatRoomUsers = await this.getChatRoomUsers(chatRoom);

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
      await this.chatRoomUserRepository.setUserRole(
        nextOwner,
        ChatRoomRole.OWNER,
      );
    }
  }

  async getChatRoomMessages(chatRoom: ChatRoomEntity) {
    return await this.messageRepository.getChatRoomMessages(chatRoom.id);
  }

  async getDmMessages(directMessage: DirectMessageEntity) {
    return await this.messageRepository.getDmMessages(directMessage.id);
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
