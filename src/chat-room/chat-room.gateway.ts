import { Logger } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { ChatRoomInfo } from './chat-room-info';
import { ChatRoomService } from './chat-room.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UpdateChatRoomDto } from './dto/update-chat-room.dto';

@WebSocketGateway({ namespace: 'chat-room' })
export class ChatRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly ChatRoomLogger = new Logger('ChatRoomLogger');

  constructor(
    private chatRoomService: ChatRoomService,
    private authService: AuthService,
  ) {}

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ) {
    if (!client.data.chatRoom || client.data.chatRoom.name === 'lobby') {
      return;
    }
    const message = await this.chatRoomService.saveMessage(
      client.data.user,
      client.data.chatRoom,
      payload,
    );
    client.to(client.data.chatRoom.name).emit('getMessage', message);
  }

  @SubscribeMessage('updateChatRoom')
  async updateChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() updateChatRoomDto: UpdateChatRoomDto,
  ) {
    const chatRoom = await this.chatRoomService.getChatRoomByName(
      updateChatRoomDto.name,
    );
    if (chatRoom.owner.id !== client.data.user.id) {
      throw new WsException('You are not owner of this chat room');
    }
    await this.chatRoomService.updateChatRoom(chatRoom, updateChatRoomDto);
    client
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
  }

  @SubscribeMessage('deleteChatRoom')
  async deleteChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
  ) {
    const chatRoom = await this.chatRoomService.getChatRoomByName(roomName);

    if (chatRoom.owner.id !== client.data.user.id) {
      throw new WsException('You are not owner of this chat room');
    }
    await this.chatRoomService.deleteChatRoom(chatRoom);
    client
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
  }

  @SubscribeMessage('createChatRoom')
  async createChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() createChatRoomDto: CreateChatRoomDto,
  ) {
    this.ChatRoomLogger.debug(createChatRoomDto);

    const isDuplicated = await this.chatRoomService.getChatRoomByName(
      createChatRoomDto.name,
    );
    if (isDuplicated) {
      throw new WsException('Chat room name is duplicated');
    }
    const chatRoom = await this.chatRoomService.createChatRoom(
      createChatRoomDto,
      client.data.user,
    );
    this.ChatRoomLogger.debug(`User ${client.data.user.id} created chat room`);
    client
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
    client.data.chatRoom = chatRoom;
    client.join(chatRoom.name);
  }

  @SubscribeMessage('enterChatRoom')
  async enterChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
  ) {
    // 이미 접속해 있는 방에 접속하려고 할 때 예외처리
    if (client.rooms.has(roomName)) {
      return;
    }
    const chatRoom = await this.chatRoomService.getChatRoomByName(roomName);
    client.data.chatRoom = chatRoom;
    client.join(roomName);
    client
      .to(client.data.chatRoom.name)
      .emit('getMessage', 'User ' + client.data.user.id + ' joined to room');
    console.log(chatRoom.messages);
    return { event: 'showChatRoomMessages', data: chatRoom.messages };
  }

  @SubscribeMessage('leaveChatRoom')
  async leaveChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
  ) {
    this.ChatRoomLogger.log('getChatRoom');
    client
      .to(roomName)
      .emit('getMessage', 'User ' + client.data.user.id + ' left the room');
    client.leave(roomName);
  }

  @SubscribeMessage('getChatRoom')
  async getChatRoom() {
    this.ChatRoomLogger.log('getChatRoom');

    return {
      event: 'showChatRoomList',
      data: await this.chatRoomService.getAllChatRooms(),
    };
  }

  async handleConnection(client: Socket) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
    }
    const chatRoom = new ChatRoomInfo();
    chatRoom.name = 'lobby';
    client.data.user = user;
    client.leave(client.id);
    client.data.chatRoom = chatRoom;
    client.join(client.data.chatRoom.name);
    this.ChatRoomLogger.log(`User ${user.id} connected, and joined to lobby`);
  }

  async handleDisconnect(client: Socket) {
    this.ChatRoomLogger.log(`User ${client.data.user.id} disconnected`);
    // console.log(client);
  }
}
