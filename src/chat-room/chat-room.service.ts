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

@Injectable()
export class ChatRoomService {
  constructor(
    private chatRoomRepository: ChatRoomRepository,
    private directMessageRepository: DirectMessageRepository,
    private messageRepository: MessageRepository,
  ) {}

  async createChatRoom(
    createChatRoomDto: CreateChatRoomDto,
    user: UserEntity,
  ): Promise<void> {
    await this.chatRoomRepository.createNewChatRoom(createChatRoomDto, user);
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

  async toggleBanUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<boolean> {
    return await this.chatRoomRepository.toggleBanUser(chatRoom, user);
  }

  async setAdminUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<void> {
    return await this.chatRoomRepository.setAdminUser(chatRoom, user);
  }

  async setMuteUser(chatRoom: ChatRoomEntity, user: UserEntity): Promise<void> {
    return await this.chatRoomRepository.setMuteUser(chatRoom, user);
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

  async getDirectMessages(user: UserEntity): Promise<DirectMessageEntity[]> {
    return await this.directMessageRepository.getDirectMessages(user);
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
  ): Promise<MessageEntity> {
    const mutedUser = await this.chatRoomRepository.getMutedUser(
      chatRoom,
      user,
    );
    if (mutedUser) {
      const now = new Date();
      // NOTE: 5 minutes
      if (now.getTime() <= mutedUser.date.getTime() + 1000 * 60 * 5) {
        throw new WsException('You are muted in this chat room');
      }
      await this.chatRoomRepository.deleteMutedUser(mutedUser);
    }

    const message = new MessageEntity();
    message.user = user;
    message.message = payload;
    message.chatRoom = chatRoom;
    message.directMessage = null;
    await this.messageRepository.saveMessage(message);
    return message;
  }

  async saveDirectMessage(
    user: UserEntity,
    directMessage: DirectMessageEntity,
    payload: string,
  ): Promise<MessageEntity> {
    if (directMessage.user1 === user && directMessage.isBlockedByUser2) {
      return;
    }

    if (directMessage.user2 === user && directMessage.isBlockedByUser1) {
      return;
    }

    const message = new MessageEntity();
    message.user = user;
    message.message = payload;
    message.directMessage = directMessage;
    message.chatRoom = null;
    await this.messageRepository.saveMessage(message);
    return message;
  }

  async deleteChatRoom(chatRoom: ChatRoomEntity) {
    await this.chatRoomRepository.deleteChatRoom(chatRoom);
  }

  async updateChatRoom(
    chatRoom: ChatRoomEntity,
    updateChatRoomDto: UpdateChatRoomDto,
  ) {
    chatRoom.name = updateChatRoomDto.name;
    chatRoom.type = updateChatRoomDto.type;
    chatRoom.password = updateChatRoomDto.password;
    await this.chatRoomRepository.save(chatRoom);
  }
}
