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
  async validateUserInLobby(client: Socket) {
    if (!client.data?.user) {
      throw new WsException('User not found');
    }

    if (
      !client.data?.chatRoomId ||
      client.data.chatRoomId !== 'lobby' ||
      !client.rooms.has(client.data.chatRoomId)
    ) {
      throw new WsException('User not in lobby');
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
      client.data.ChatRoomId,
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
      throw new WsException('Chat room name is duplicated');
    }
  }
}