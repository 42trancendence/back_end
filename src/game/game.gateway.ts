import {
  SubscribeMessage,
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Client } from 'socket.io/dist/client';
// import { GameService } from './game.service';

@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // constructor(private readonly gameService: GameService) {}

  async handleConnection(client: Socket) {
    console.log('client connected', client.id);
    client.leave(client.id);
    client.data.roomId = 'room:lobby';
    client.join('room:lobby');
  }
  async handleDisconnect(client: any) {
    const { roomId } = client.data;
    console.log('client disconnected', client.id);

  }

  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    console.log('message', payload, client.id);
    return 'Hello world!';
  }
}
