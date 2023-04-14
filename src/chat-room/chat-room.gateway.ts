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
import { ChatRoomValidationPipe } from './pipes/chat-room-validation.pipe';

@WebSocketGateway({
  namespace: 'chat-room',
  cors: { origin: 'http://localhost:4000', credentials: true },
})
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
    client.broadcast.to(client.data.chatRoom.name).emit('getMessage', message);
  }

  @SubscribeMessage('updateChatRoom')
  async updateChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(ChatRoomValidationPipe) updateChatRoomDto: UpdateChatRoomDto,
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
    @MessageBody(ChatRoomValidationPipe) createChatRoomDto: CreateChatRoomDto,
  ) {
    this.ChatRoomLogger.debug(createChatRoomDto);

    const isDuplicated = await this.chatRoomService.getChatRoomByName(
      createChatRoomDto.name,
    );
    if (isDuplicated) {
      this.ChatRoomLogger.debug('이미 존재하는 chat-room 이름 입니다.');
      throw new WsException('이미 존재하는 chat-room 이름 입니다.');
    }
    await this.chatRoomService.createChatRoom(
      createChatRoomDto,
      client.data.user,
    );
    this.ChatRoomLogger.debug(`User ${client.data.user.id} created chat room`);
    await this.clientJoinChatRoom(
      client,
      createChatRoomDto.name,
      createChatRoomDto.password,
    );
    this.server
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
  }

  async getChatRoomUsers(roomName: string) {
    const allSockets = await this.server.in(roomName).fetchSockets();
    const chatRoomUsers = new Set<string>();
    for (const socket of allSockets) {
      socket.data.user && chatRoomUsers.add(socket.data.user.name);
    }
    const serializedSet = [...chatRoomUsers.keys()];
    return serializedSet;
  }

  async clientJoinChatRoom(
    client: Socket,
    chatRoomName: string,
    password: string,
  ) {
    const chatRoom = await this.chatRoomService.getChatRoomByName(chatRoomName);
    if (chatRoom.isPrivate && chatRoom.password !== password) {
      throw new WsException('Wrong password');
    }
    client.leave('lobby');
    client.data.chatRoom = chatRoom;
    client.join(chatRoomName);
    client
      .to(chatRoomName)
      .emit('getChatRoomUsers', await this.getChatRoomUsers(chatRoomName));
    client.to(chatRoomName).emit('getChatRoomMessages', chatRoom.messages);
    this.ChatRoomLogger.debug(chatRoom.messages);
  }

  @SubscribeMessage('enterChatRoom')
  async enterChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
    @MessageBody('password') password: string,
  ) {
    if (client.rooms.has(roomName)) {
      return;
    }
    if (client.rooms.size > 1) {
      client.leave(client.data.chatRoom.name);
    }
    await this.clientJoinChatRoom(client, roomName, password);
  }

  @SubscribeMessage('leaveChatRoom')
  async leaveChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
  ) {
    this.ChatRoomLogger.debug('getChatRoom');
    client.leave(roomName);
  }

  async handleConnection(client: Socket) {
    this.ChatRoomLogger.debug('chat-room handleConnection');
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
    // this.ChatRoomLogger.log(`User ${user.id} connected, and joined to lobby`);
    client.emit(
      'showChatRoomList',
      await this.chatRoomService.getAllChatRooms(),
    );
  }

  async handleDisconnect(client: Socket) {
    this.ChatRoomLogger.log(`User ${client.data.user.id} disconnected`);
  }
}
