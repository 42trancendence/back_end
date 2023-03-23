import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
import { ChatRoomInfo } from './chat-room-info';
import { ChatRoomRepository } from './chat-room.repository';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UpdateChatRoomDto } from './dto/update-chat-room.dto';
import { ChatRoomEntity } from './entities/chatRoom.entity';
import { MessageEntity } from './entities/message.entity';
import { MessageRepository } from './message.repository';

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

  async getAllChatRooms(): Promise<ChatRoomInfo[]> {
    const found = await this.chatRoomRepository.getAllChatRooms();
    const chatRoomArr: ChatRoomInfo[] = new Array<ChatRoomInfo>();
    found.forEach((value) => {
      chatRoomArr.push({
        name: value.name,
        owner: value.owner.name,
        isPrivate: value.isPrivate,
      });
    });
    return chatRoomArr;
  }

  async getChatRoomById(chatRoomId: number): Promise<ChatRoomEntity> {
    return await this.chatRoomRepository.getChatRoom(chatRoomId);
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
  }

  async updateChatRoom(
    chatRoom: ChatRoomEntity,
    updateChatRoomDto: UpdateChatRoomDto,
  ) {
    chatRoom.name = updateChatRoomDto.name;
    chatRoom.description = updateChatRoomDto.description;
    chatRoom.isPrivate = updateChatRoomDto.isPrivate;
    chatRoom.password = updateChatRoomDto.password;

    await this.chatRoomRepository.save(chatRoom);
  }
}
