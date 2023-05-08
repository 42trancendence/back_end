import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatRoomService } from './chat-room.service';
import { ChatRoomEntity } from './entities/chatRoom.entity';
import { DirectMessageEntity } from './entities/directMessage.entity';
import { ChatRoomRole } from './enum/chat-room-role.enum';

@Injectable()
export class ChatRoomValidation {
  constructor(private chatRoomService: ChatRoomService) {}

  async validateUser(client: Socket) {
    if (!client.data?.user) {
      throw new WsException('User not found');
    }

    if (!client.data?.chatRoomId || !client.rooms.has(client.data.chatRoomId)) {
      throw new WsException('User not in chat');
    }
  }

  async validateUserInLobby(client: Socket) {
    if (!client.data?.user) {
      throw new WsException('존재하지 않는 유저입니다.');
    }

    if (
      !client.data?.chatRoomId ||
      client.data.chatRoomId !== 'lobby' ||
      !client.rooms.has(client.data.chatRoomId)
    ) {
      throw new WsException('해당 유저가 대기실에 있지 않습니다.');
    }
  }

  async validateUserInDirectMessage(
    client: Socket,
  ): Promise<DirectMessageEntity> {
    if (!client.data?.user) {
      throw new WsException('User not found');
    }
    if (
      !client.data?.chatRoomId ||
      !client.rooms.has(client.data.chatRoomId) ||
      client.data.chatRoomId === 'lobby'
    ) {
      throw new WsException('User not in direct message');
    }

    const directMessage = await this.chatRoomService.getDirectMessageById(
      client.data.chatRoomId,
    );
    if (!directMessage) {
      throw new WsException('Direct message not found');
    }
    return directMessage;
  }

  async validateUserInChatRoom(client: Socket): Promise<ChatRoomEntity> {
    if (!client.data?.user) {
      throw new WsException('User not found');
    }

    if (
      !client.data?.chatRoomId ||
      !client.rooms.has(client.data.chatRoomId) ||
      client.data.chatRoomId === 'lobby'
    ) {
      throw new WsException('User not in chat room');
    }

    const chatRoom = await this.chatRoomService.getChatRoomById(
      client.data.chatRoomId,
    );
    if (!chatRoom) {
      throw new WsException('Chat room not found');
    }
    return chatRoom;
  }

  async validateChatRoomOwnerShip(client: Socket): Promise<ChatRoomEntity> {
    const chatRoom = await this.validateUserInChatRoom(client);

    const chatRoomUser = await this.chatRoomService.getChatRoomUser(
      chatRoom,
      client.data.user,
    );
    if (!chatRoomUser || chatRoomUser.role !== ChatRoomRole.OWNER) {
      throw new WsException('User is not owner of chat room');
    }
    return chatRoom;
  }

  async validateChatRoomAdmin(client: Socket): Promise<ChatRoomEntity> {
    const chatRoom = await this.validateUserInChatRoom(client);

    const chatRoomUser = await this.chatRoomService.getChatRoomUser(
      chatRoom,
      client.data.user,
    );
    if (!chatRoomUser || chatRoomUser.role === ChatRoomRole.NORMAL) {
      throw new WsException('User is not admin of chat room');
    }
    return chatRoom;
  }

  async validateCreateChatRoom(client: Socket, chatRoomName: string) {
    await this.validateUserInLobby(client);
    const isDuplicatedName = await this.chatRoomService.getChatRoomByName(
      chatRoomName,
    );
    if (isDuplicatedName) {
      throw new WsException('이미 존재하는 채팅방 이름입니다.');
    }
  }
}
