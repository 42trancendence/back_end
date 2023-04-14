import { Logger, NotFoundException } from '@nestjs/common';
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
import { MAX_QUEUE_SIZE, SET_INTERVAL_TIME } from './constants/game.constant';
import { GameStatus, GameVariable } from './constants/gameVariable';

@WebSocketGateway({ 
  namespace: 'game',
  cors: {
    origin: 'http://localhost:4000/lobby/game',
    methods: ['GET', 'POST'],
    credentials: true,
  }
})
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
    this.WsLogger.log('afterInit');
    
    setInterval(async ()=> {
      await this.gameService.createGame(this.server);
    }, SET_INTERVAL_TIME)
  }

  async handleConnection(client: Socket) {
    this.WsLogger.debug(`Client connected: ${client.id}`);
    
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }

    if (client.data?.user) {
      this.WsLogger.log(`User ${client.data.user.id}: ${client.data.user.name} is already in lobby`);
      return;
    }
    client.data.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarImageUrl: user.avatarImageUrl,
    }

    client.leave(client.id);
    client.join('lobby');
    // 로비에 있는 유저들에게 새로운 유저가 입장했다고 알린다. (로비에서 로비뷰에 있는 유저들 표시가 필요, 없으면 삭제)
    this.server.to('lobby').emit(`connectUser: ${client.data.user.id}`);
    this.WsLogger.log(`User ${user.name} connected, and joined to gameLobby`);
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
    
  // @SubscribeMessage('connectUser')
  // async connectUser(@ConnectedSocket() client: Socket) {
    // const user = await this.authService.getUserBySocket(client);
    // if (!user) {
    //   client.disconnect();
    //   throw new WsException('Unauthorized');
    // }
    // // 유저가 이미 로비에 있는지 확인(아이디 하나로 테스트 하기 위해 임시 주석처리)
    // // if (this.playerList.isUserInPlayersById(user.id) == true) {
    // //   this.WsLogger.log(`User ${user.id}: ${user.name} is already in lobby`);
    // //   return;
    // // }
    // const player = new Player(
    //   user.id,
    //   'lobby',
    //   user.name,
    //   user.email,
    //   user.avatarImageUrl,
    //   true // 테스트용
    // );
    // this.playerList.addUser(player);
    // client.leave('lobby');
    // client.join('lobby');
    // // 로비에 있는 유저들에게 새로운 유저가 입장했다고 알린다. (로비에서 로비뷰에 있는 유저들 표시가 필요, 없으면 삭제)
    // this.server.to('lobby').emit('connectUser', player.getName());

    // this.WsLogger.log(`User ${user.id}: ${user.name} connected, and joined to gameLobby`);
  // }

  @SubscribeMessage('postGameList')
  async postGameList(@ConnectedSocket() client: Socket) {
    if (!client.data?.user){
      client.disconnect();
      client.emit('getGameList', 'disconnected');
      throw new WsException('Unauthorized');
    }
    const gameList = await this.gameService.getGameList();
    client.emit('getGameList', gameList);
    this.WsLogger.log(`User ${client.data.user.name}: get gameList`);
  }

  @SubscribeMessage('postMatching')
  async postMatching(@ConnectedSocket() client: Socket) {
    if (!client.data?.user){
      client.disconnect();
      client.emit('getMatching', 'disconnected');
      throw new WsException('Unauthorized');
    }

    const allSockets = await this.server.in('matching').fetchSockets();
    if (allSockets.length >= MAX_QUEUE_SIZE) {
      client.emit('getMatching', 'full');
      return;
    }

    client.leave('lobby');
    client.join('matching');
    client.emit('getMatching', 'matching');
  }

  @SubscribeMessage('cancelMatching')
  async leaveWait(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('getMatching', 'disconnected');
      throw new WsException('Unauthorized');
    }

    client.leave('matching');
    client.join('lobby');
    const playerName = client.data.user.name;
    this.WsLogger.log(`${playerName} is leave wait`);
  }


  // 매칭되면 매칭된 유저에게 메시지 보내야 한다. (socket.id 사용하면 안된다.)
  @SubscribeMessage('joinGame')
  async joinGame(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    // TODO
    // 1. 룸 아이디로 DB에서 게임 정보를 가져온다.
    // const gameRoom = await this.gameService.getGameRoomByRoomId(roomId);
    const gameRoom = {
      id: '1',
      roomId: '1',
      player1: {
        id: '1',
        name: '1',
        email: '1',
        avatarImageUrl: '1',
        isReady: GameStatus.Wait,
      },
      player2: {
        id: '2',
        name: '2',
        email: '2',
        avatarImageUrl: '2',
        isReady: GameStatus.Wait,
      },
    };
    // if (!gameRoom) {
    //   this.WsLogger.log(`GameRoom ${roomId} is not exist`);
    //   return;
    // }
    // 2. 게임 정보를 기반으로 게임에 참여한다.
    client.leave('lobby');
    client.join(roomId);
    // 3. 게임에 참여한 유저에게 게임 정보를 보낸다.
    client.emit('getGameRoomInfo', gameRoom);
    this.WsLogger.log(`User ${client.id} joined game ${roomId}`);
  }

  @SubscribeMessage('leaveGame')
  async leaveGame(@ConnectedSocket() client: Socket) {
    // TODO
    // 1. 유저가 게임에 참여하고 있는지 확인한다.
    // 2. 게임에 참여하고 있다면 게임을 종료한다.
    // 3. 유저가 로비에 있는지 확인한다.

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
    // TODO
    // 1. 게임에 필요한 볼, 패들, 스코어 가져오기
    // 2. 게임 상태에 따라 게임 진행
    // 3. 게임 종료 후 DB에 저장
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
        // this.gameService.updateGameState(game);
      }
    }
    else if (game.getGameStatus() == GameStatus.End) {
      game.setGameStatus(GameStatus.Wait);
    }

    client.emit('gaming', game);
  }
}