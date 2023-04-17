import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
import { ChatRoomInfo } from './chat-room-info';
import { ChatRoomRepository } from './repository/chat-room.repository';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UpdateChatRoomDto } from './dto/update-chat-room.dto';
import { ChatRoomEntity } from './entities/chatRoom.entity';
import { MessageEntity } from './entities/message.entity';
import { MessageRepository } from './repository/message.repository';

@Injectable()
export class ChatRoomService {
  constructor(
    private chatRoomRepository: ChatRoomRepository,
    private messageRepository: MessageRepository,
  ) {}

  async createChatRoom(
    createChatRoomDto: CreateChatRoomDto,
    user: UserEntity,
  ): Promise<void> {
    await this.chatRoomRepository.createNewChatRoom(createChatRoomDto, user);
  }

  async isChatRoomOwner(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<boolean> {
    return chatRoom.owner.id === user.id;
  }

  async banUser(chatRoom: ChatRoomEntity, user: UserEntity): Promise<void> {}

  async kickUser(chatRoom: ChatRoomEntity, user: UserEntity): Promise<void> {}

  async muteUser(chatRoom: ChatRoomEntity, user: UserEntity): Promise<void> {}

  async getAllChatRooms(): Promise<ChatRoomEntity[]> {
    return await this.chatRoomRepository.getAllChatRooms();
  }

  async getChatRoomById(chatRoomId: number): Promise<ChatRoomEntity> {
    return await this.chatRoomRepository.getChatRoomById(chatRoomId);
  }

  async getChatRoomByName(chatRoomName: string): Promise<ChatRoomEntity> {
    return await this.chatRoomRepository.getChatRoomByName(chatRoomName);
  }

  async saveMessage(
    user: UserEntity,
    chatRoom: ChatRoomEntity,
    payload: string,
  ) {
    const message = new MessageEntity();

    message.user = user;
    message.message = payload;
    message.timestamp = new Date();
    message.chatRoom = chatRoom;

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
