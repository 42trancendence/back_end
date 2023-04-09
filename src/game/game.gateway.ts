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
import { AuthService } from 'src/auth/auth.service';
import { GameService } from './game.service';
import { WaitQueue } from './classes/waitQueue.class';
import { Players } from './classes/players.class';
import { User } from './classes/user.class'
import { GameManager } from './classes/gameManager.class';
import { SET_INTERVAL_TIME } from './constants/game.constant';
import { json } from 'stream/consumers';

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

  private gameManager: GameManager = new GameManager();
  private waitQueue: WaitQueue = new WaitQueue();
  private players: Players = new Players();

  afterInit() {
    this.WsLogger.log('Game Websocket Initialized');
    setInterval(()=> {
      if (this.waitQueue.getQueueLength() >= 2) {
        const matchingPlayers: Array<User> = this.waitQueue.getMatchPlayers();
        // 매칭된 유저들로 새로운 게임방 생성
        this.gameService.createGame(this.server, matchingPlayers, this.gameManager, this.players);
        this.WsLogger.log(`Game ${matchingPlayers[0].getName() + matchingPlayers[1].getName()} created`);
      }
    }, SET_INTERVAL_TIME)
  }

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

  @SubscribeMessage('check')
  checkAll(@ConnectedSocket() client: Socket) {
    console.log('rooms', this.server.adapter['rooms']);
    console.log('socketId', client.id);
    client.emit(
      'check',
      `
      players: ${JSON.stringify(this.players)},
      waitQueue: ${JSON.stringify(this.waitQueue)},
      gameAll: ${JSON.stringify(this.gameManager)},
      `,
    );
  }
    
  @SubscribeMessage('connectUser')
  async connectUser(@ConnectedSocket() client: Socket) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }
    // 유저가 이미 로비에 있는지 확인(아이디 하나로 테스트 하기 위해 임시 주석처리)
    // if (this.players.isUserInPlayersById(user.id) == true) {
    //   this.WsLogger.log(`User ${user.id}: ${user.name} is already in lobby`);
    //   return;
    // }
    const gameUser = new User(
      user.id,
      client.id,
      'lobby',
      user.name,
      user.email,
      user.avatarImageUrl,
    );
    this.players.addUser(gameUser);
    client.leave('lobby');
    client.join('lobby');
    // 로비에 있는 유저들에게 새로운 유저가 입장했다고 알린다. (로비에서 로비뷰에 있는 유저들 표시가 필요, 없으면 삭제)
    this.server.to('lobby').emit('connectUser', gameUser.getName());

    this.WsLogger.log(`User ${user.id}: ${user.name} connected, and joined to gameLobby`);
  }

  @SubscribeMessage('matching')
  async matching(@ConnectedSocket() client: Socket) {
    // client 에 데이터 저장 or User class 에 데이터 저장
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }
    if (this.players.isUserById(user.id) == false) {
      this.WsLogger.log(`User ${user.id}: ${user.name} is not in lobby`);
      return;
    }
    const gameUser = this.players.getUserById(user.id);
    // 매칭 대기열 최대인원 확인
    if (this.waitQueue.isQueueFull() == true) {
      this.server.to(client.id).emit('matching', 'full');
      this.WsLogger.log(`User ${gameUser.getId()}: ${gameUser.getName()} is full`);
      return;
    }
    // 테스트 주석처리!!!!!!! // 이미 매칭 대기열에 있는지 or 게임방에 참여 했는지 확인
    // if (gameUser.getRoomId() !== 'lobby' || this.waitQueue.isUserInQueueById(gameUser.getId()) == true) {
    //   this.server.to(client.id).emit('matching', 'already');
    //   this.WsLogger.log(`User ${gameUser.getId()}: ${gameUser.getName()} is already`);
    //   return;
    // }
    this.waitQueue.addUser(gameUser);
    this.server.to(client.id).emit('matching', 'matching');
    this.WsLogger.log(`User ${gameUser.getId()}: ${gameUser.getName()} is matching`);
  }

  @SubscribeMessage('cancelMatching')
  async leaveWait(@ConnectedSocket() client: Socket) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }
    const gameUser = this.players.getUserBySocketId(user.id);
    if (!gameUser) {
      this.WsLogger.log(`User ${user.id}: ${user.name} is not in lobby`);
      return;
    }
    this.waitQueue.removeUser(gameUser);
    this.WsLogger.log(`User [${gameUser.getId()}: ${gameUser.getName()}] is leave wait`);
  }

  @SubscribeMessage('joinGame')
  async joinGame(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    // roomId = JSON.stringify(roomId);
    const game = this.gameManager.getGameByRoomId(roomId);
    if (!game) {
      this.WsLogger.log(`Game ${roomId} is not exist`);
      return;
    }
    const user = this.players.getUserBySocketId(client.id);
    if (!user) {
      this.WsLogger.log(`User ${client.id} is not in players`);
      return;
    }
    user.setRoomId(roomId);
    game.addUser(user);
    // socket에 roomId 저장
    client.leave('lobby');
    this.WsLogger.log(`User ${client.id} left lobby`);
    client.join(roomId);
    this.WsLogger.log(`User ${client.id} joined game ${roomId}`);
  }

  @SubscribeMessage('leaveGame')
  async leaveGame(@ConnectedSocket() client: Socket) {
    const user = this.players.getUserById(client.id);
    const roomId = user.getRoomId();
    if (this.gameManager.isGameByRoomId(roomId) == false) {
      return;
    }
    this.gameManager.removeGame(roomId);
    if (user === undefined) {
      this.WsLogger.log(`[leaveGame] User ${client.id} is not in players`);
      return;
    }
    user.setRoomId('lobby');
    client.leave(roomId);
    this.WsLogger.log(`User ${client.id} left game ${roomId}`);
    client.join('lobby');
    this.WsLogger.log(`User ${client.id} joined lobby`);
  }

  @SubscribeMessage('startGame')
  async startGame(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    if (this.gameManager.isGameByRoomId(roomId) == false) {
      this.WsLogger.log(`Game ${roomId} is not exist`);
      return;
    }
    const game = this.gameManager.getGameByRoomId(roomId);
    game.startGame();
    this.server.to(roomId).emit('startGame', game);
    this.WsLogger.log(`Game ${roomId} started`);
  }


}