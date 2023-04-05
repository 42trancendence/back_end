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
import { User } from './classes/user.class'

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
  private players: Players = new Players();

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
    const gameUser = new User(
      user.id,
      user.name,
      user.email,
      user.avatarImageUrl,
      'lobby',
      '',
    );
    // 유저가 이미 로비에 있는지 확인
    if (this.players.isUserInPlayers(gameUser) == true) {
      return ;
    }
    this.players.addUser(gameUser);
    // TODO: 로비에 있는 유저들에게 자신을 제외하고 입장했다고 알린다.
    this.server.emit('userConnect', JSON.stringify(gameUser));
    // server 와 client 에 업데이트 해야 하는가?
    client.leave('lobby');
    client.join('lobby');
    

    this.WsLogger.log(`User ${user.id} connected, and joined to gameLobby`);
  }

  @SubscribeMessage('matching')
  async joinRoom(@ConnectedSocket() client: Socket) {
    // TODO: 큐에 넣어 대기 상태를 만든다.
  }

}
