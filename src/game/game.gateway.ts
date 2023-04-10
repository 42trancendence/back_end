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
import { PlayerList } from './classes/playerList.class';
import { Player } from './classes/player.class'
import { GameManager } from './classes/gameManager.class';
import { SET_INTERVAL_TIME } from './constants/game.constant';
import { GameStatus } from './constants/gameVariable';

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
  private playerList: PlayerList = new PlayerList();

  afterInit() {
    this.WsLogger.log('Game Websocket Initialized');
    setInterval(()=> {
      if (this.waitQueue.getQueueLength() >= 2) {
        const matchingPlayers: Array<Player> = this.waitQueue.getMatchPlayers();
        // 매칭된 유저들로 새로운 게임방 생성
        this.gameService.createGame(this.server, matchingPlayers, this.gameManager, this.playerList);
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
    const player = this.playerList.getPlayerByUserId(user.id);
    if (player) {
      this.WsLogger.log(`User ${user.id}: ${user.name} is already in lobby`);
      client.join(player.getRoomId());
      return;
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
      playerList: ${JSON.stringify(this.playerList)},
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
    // if (this.playerList.isUserInPlayersById(user.id) == true) {
    //   this.WsLogger.log(`User ${user.id}: ${user.name} is already in lobby`);
    //   return;
    // }
    const player = new Player(
      user.id,
      'lobby',
      user.name,
      user.email,
      user.avatarImageUrl,
      true // 테스트용
    );
    this.playerList.addUser(player);
    client.leave('lobby');
    client.join('lobby');
    // 로비에 있는 유저들에게 새로운 유저가 입장했다고 알린다. (로비에서 로비뷰에 있는 유저들 표시가 필요, 없으면 삭제)
    this.server.to('lobby').emit('connectUser', player.getName());

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
    if (this.playerList.isPlayerByUserId(user.id) == false) {
      this.WsLogger.log(`User ${user.id}: ${user.name} is not in lobby`);
      return;
    }
    const player = this.playerList.getPlayerByUserId(user.id);
    // 매칭 대기열 최대인원 확인
    if (this.waitQueue.isQueueFull() == true) {
      this.server.to(client.id).emit('matching', 'full');
      this.WsLogger.log(`User ${player.getId()}: ${player.getName()} is full`);
      return;
    }
    // 테스트 주석처리!!!!!!! // 이미 매칭 대기열에 있는지 or 게임방에 참여 했는지 확인
    // if (player.getRoomId() !== 'lobby' || this.waitQueue.isUserInQueueById(player.getId()) == true) {
    //   this.server.to(client.id).emit('matching', 'already');
    //   this.WsLogger.log(`User ${player.getId()}: ${player.getName()} is already`);
    //   return;
    // }
    this.waitQueue.addUser(player);
    this.server.to(client.id).emit('matching', 'matching');
    this.WsLogger.log(`User ${player.getId()}: ${player.getName()} is matching`);
  }

  @SubscribeMessage('cancelMatching')
  async leaveWait(@ConnectedSocket() client: Socket) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }
    const player = this.playerList.getPlayerByUserId(user.id);
    if (!player) {
      this.WsLogger.log(`User ${user.id}: ${user.name} is not in lobby`);
      return;
    }
    this.waitQueue.removeUser(player);
    this.WsLogger.log(`User [${player.getId()}: ${player.getName()}] is leave wait`);
  }

  @SubscribeMessage('joinGame')
  async joinGame(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    const game = this.gameManager.getGameByRoomId(roomId);
    if (!game) {
      this.WsLogger.log(`Game ${roomId} is not exist`);
      return;
    }
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }
    const player = this.playerList.getPlayerByUserId(user.id);
    if (!player) {
      this.WsLogger.log(`User ${client.id} is not in playerList`);
      return;
    }
    player.setRoomId(roomId);
    game.addUser(player);
    // socket에 roomId 저장
    client.leave('lobby');
    this.WsLogger.log(`User ${client.id} left lobby`);
    client.join(roomId);
    this.WsLogger.log(`User ${client.id} joined game ${roomId}`);
  }

  @SubscribeMessage('leaveGame')
  async leaveGame(@ConnectedSocket() client: Socket) {
    const user = this.playerList.getPlayerByUserId(client.id);
    const roomId = user.getRoomId();
    if (this.gameManager.isGameByRoomId(roomId) == false) {
      return;
    }
    this.gameManager.removeGame(roomId);
    if (!user) {
      this.WsLogger.log(`[leaveGame] User ${client.id} is not in playerList`);
      return;
    }
    user.setRoomId('lobby');
    client.leave(roomId);
    this.WsLogger.log(`User ${client.id} left game ${roomId}`);
    client.join('lobby');
    this.WsLogger.log(`User ${client.id} joined lobby`);
  }

  @SubscribeMessage('settingGame')
  async startGame(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    if (this.gameManager.isGameByRoomId(roomId) == false) {
      this.WsLogger.log(`Game ${roomId} is not exist`);
      return;
    }
    const game = this.gameManager.getGameByRoomId(roomId);
    // TODO: 게임 시작전 세팅

    this.server.to(roomId).emit('startGame', game);
    this.WsLogger.log(`Game ${roomId} started`);
  }

  @SubscribeMessage('gaming')
  async gaming(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    const game = this.gameManager.getGameByRoomId(roomId);
    if (!game) {
      this.WsLogger.log(`Game ${roomId} is not exist`);
      return;
    }
    if (game.getGameStatus() == GameStatus.Wait) {
      game.setGameStatus(GameStatus.Play);
    }
    else if (game.getGameStatus() == GameStatus.Play) {
      if (game.getPlayers[0].getScore() >= 10 || game.getPlayers[1].getScore() >= 10) {
        game.setGameStatus(GameStatus.End);
        // TODO: 게임 종료 후 DB에 저장
        this.gameService.saveGameState(game);
      }
    }
    else if (game.getGameStatus() == GameStatus.End) {
      game.setGameStatus(GameStatus.Wait);
    }

    this.server.to(roomId).emit('gaming', game);
  }
}