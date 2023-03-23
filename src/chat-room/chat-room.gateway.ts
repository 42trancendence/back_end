import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';
import { ChatRoomService } from './chat-room.service';

@WebSocketGateway()
export class ChatRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(
    private chatRoomService: ChatRoomService,
    private usersService: UsersService,
  ) {}

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ): Promise<string> {
    await this.chatRoomService.saveMessage(
      client.data.user,
      client.data.chatRoom,
      payload,
    );
    client.to(client.rooms[1]).emit('message', payload);
    return payload;
  }

  @SubscribeMessage('enterChatRoom')
  async enterChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
  ) {
    const chatRoom = await this.chatRoomService.getChatRoomByName(roomName);

    client.data.chatRoom = chatRoom;
    client.join(roomName);
  }

  async handleConnection(socket: Socket): Promise<void> {
    // const user = await this.usersService.getUserBySocket(socket);
    // socket.data.user = user;
  }

  async handleDisconnect(client: Socket) {
    // console.log(client);
  }
}
