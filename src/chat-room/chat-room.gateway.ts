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

@WebSocketGateway({ namespace: 'chat-room' })
export class ChatRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly WsLogger = new Logger('WsLogger');

  constructor(
    private chatRoomService: ChatRoomService,
    private authService: AuthService,
  ) {}

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ): Promise<string> {
    await this.chatRoomService.saveMessage(
      client.data.user,
      client.data.chatRoom,
      payload,
    );
    client.to(client.data.chatRoom.name).emit('getMessage', payload);
    return payload;
  }

  @SubscribeMessage('deleteChatRoom')
  async deleteChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
  ) {
    // TODO: check if user is owner of the chat room
    // await this.chatRoomService.deleteChatRoom(roomName);
    client
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
  }

  @SubscribeMessage('createChatRoom')
  async createChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() createChatRoomDto: CreateChatRoomDto,
  ) {
    this.WsLogger.debug(createChatRoomDto);
    // TODO : check duplicated chat room name
    const chatRoom = await this.chatRoomService.createChatRoom(
      createChatRoomDto,
      client.data.user,
    );
    this.WsLogger.debug(`User ${client.data.user.id} created chat room`);
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
    const chatRoom = await this.chatRoomService.getChatRoomByName(roomName);

    client.data.chatRoom = chatRoom;
    client.join(roomName);
    client
      .to(roomName)
      .emit('getMessage', 'User ' + client.data.user.id + ' joined to room');

    // TODO: get messages from database
    const messages = chatRoom.messages;
    console.log('messages', messages);
  }

  @SubscribeMessage('leaveChatRoom')
  async leaveChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
  ) {
    client
      .to(roomName)
      .emit('getMessage', 'User ' + client.data.user.id + ' left the room');
    client.leave(roomName);
  }

  @SubscribeMessage('getChatRoom')
  async getChatRoom() {
    this.WsLogger.log('getChatRoom');

    const event = 'showChatRoomList';
    const data = await this.chatRoomService.getAllChatRooms();
    return { event, data };
  }

  async handleConnection(client: Socket) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      throw new WsException('User not found');
    }
    const chatRoom = new ChatRoomInfo();
    chatRoom.name = 'lobby';
    client.data.user = user;
    client.leave(client.id);
    client.data.chatRoom = chatRoom;
    client.join(client.data.chatRoom.name);
    this.WsLogger.log(`User ${user.id} connected, and joined to lobby`);
  }

  async handleDisconnect(client: Socket) {
    this.WsLogger.log(`User ${client.data.user.id} disconnected`);
    // console.log(client);
  }
}
