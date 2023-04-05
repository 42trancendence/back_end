import { Logger } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect, 
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
// import { GameService } from './game.service';
import { AuthService } from 'src/auth/auth.service';
import { GameService } from './game.service';
import { Game } from './classes/game.class';
import { WaitQueue } from './classes/waitList.class';
import { Players } from './classes/players.class';

@WebSocketGateway({ namespace: 'game' })
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly WsLogger = new Logger('GameWsLogger');

  constructor(
    private gameService: GameService,
    private authService: AuthService,
  ) {}

  private game: Game[] = [];
  private waitQueue: WaitQueue;
  private players: Players;

  async handleConnection(client: Socket) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }
    this.WsLogger.log(`User ${user.id} connected, and joined to gameLobby`);
  }

  async handleDisconnect(client: Socket) {
    console.log('client disconnected', client.id);
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
    ): Promise<string> {
      console.log('message', this.server.adapter['rooms']);
      return Promise.resolve('Hello world!');
    }
  
  // @SubscribeMessage('match')
  // match(@ConnectedSocket() client: Socket) {
  //   WaitQueue.addPlayer(client);
  // }
    
  @SubscribeMessage('userConnect')
  async userConnect(@ConnectedSocket() client: Socket) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }
    const gameUser = {
      id: user.id,
      name: user.name,
      avatarImageUrl: user.avatarImageUrl,
      status: 'lobby',
      roomId: '',
    }
    this.players.addUser(user);

    

    this.WsLogger.log(`User ${user.id} connected, and joined to gameLobby`);
  }

  @SubscribeMessage('matching')
  async joinRoom(@ConnectedSocket() client: Socket) {
    // TODO: 큐에 넣어 대기 상태를 만든다.
  }

}
