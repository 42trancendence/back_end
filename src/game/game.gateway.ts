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
import { GameManager } from './classes/gameManager.class';
import {
  GAME_FRAME,
  MAX_QUEUE_SIZE,
  SET_INTERVAL_TIME,
} from './constants/game.constant';
import { GameStatus } from './constants/gameVariable';

@WebSocketGateway({
  namespace: 'game',
  cors: {
    origin: 'http://localhost:4000/lobby/game',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly WsLogger = new Logger('GameWsLogger');

  constructor(
    private gameService: GameService,
    private authService: AuthService,
  ) {}

  private gameManager: GameManager = new GameManager();

  afterInit() {
    this.WsLogger.log('afterInit');

    setInterval(async () => {
      await this.gameService.createGame(this.server, this.gameManager);
    }, SET_INTERVAL_TIME);

    setInterval(async () => {
      this.gameManager.sendGame(this.server);
    }, GAME_FRAME);
  }

  async handleConnection(client: Socket) {
    this.WsLogger.debug(`Client connected: ${client.id}`);
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }

    // 이미 접속한 유저라면
    const roomId = await this.gameService.getRoomIdByUserId(user.id);
    if (roomId) {
      client.join(roomId);
      client.data.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarImageUrl: user.avatarImageUrl,
      };
      client.data.roomId = roomId;
      return this.WsLogger.debug(`[${user.name}] is already in [${roomId}]`);
    }

    if (client.data?.user) {
      this.WsLogger.debug(
        `User ${client.data.user.id}: ${client.data.user.name} is already in lobby`,
      );
      return;
    }
    client.data.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarImageUrl: user.avatarImageUrl,
    };

    client.leave(client.id);
    client.join('lobby');
    // 로비에 있는 유저들에게 새로운 유저가 입장했다고 알린다. (로비에서 로비뷰에 있는 유저들 표시가 필요, 없으면 삭제)
    this.server.to('lobby').emit(`connectUser: ${client.data.user.id}`);
    this.WsLogger.log(`User [${user.name}] connected`);
  }

  async handleDisconnect(client: Socket) {
    this.WsLogger.debug(`client disconnected: : ${client.id}`);
  }

  @SubscribeMessage('check')
  checkAll(@ConnectedSocket() client: Socket) {
    console.log('rooms', this.server.adapter['rooms']);
    console.log('socketId', client.id);
    client.emit(
      'check',
      `
      gameAll: ${JSON.stringify(this.gameManager)},
      `,
    );
  }

  @SubscribeMessage('getGameList')
  async getGameList(@ConnectedSocket() client: Socket) {
    // 여기서 에러가 난다. (클라이언트가 연결 되었다가 비동기로 여기로 들어와서 data.user 가 없는것을 확인하고 연결이 끊기는 것 같다. 다른 에러 처리가 필요할듯?)
    // if (!client.data?.user) {
    //   client.disconnect();
    //   client.emit('getGameList', 'disconnected');
    //   throw new WsException('Unauthorized');
    // }
    const gameList = await this.gameService.getGameList();
    if (!gameList) {
      this.WsLogger.error('gameList is null');
      return;
    }
    client.emit('getGameList', gameList);
    // this.WsLogger.log(`User ${client.data.user.name}: get gameList`);
    this.WsLogger.log(`User ${client.id}: get gameList`);
  }

  @SubscribeMessage('postMatching')
  async postMatching(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
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
  async joinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomId: string,
  ) {
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
    // const user = this.playerList.getPlayerByUserId(client.id);
    // const roomId = user.getRoomId();
    // if (this.gameManager.isGameByRoomId(roomId) == false) {
    //   return;
    // }
    // this.gameManager.removeGame(roomId);
    // if (!user) {
    //   this.WsLogger.log(`[leaveGame] User ${client.id} is not in playerList`);
    //   return;
    // }
    // user.setRoomId('lobby');
    // client.leave(roomId);
    // this.WsLogger.log(`User ${client.id} left game ${roomId}`);
    // client.join('lobby');
    // this.WsLogger.log(`User ${client.id} joined lobby`);
  }

  @SubscribeMessage('postReady')
  async postReady(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('postKey', 'disconnected');
      throw new WsException('Unauthorized');
    }
    const data = client.data;

    const roomId = data.roomId;
    const game = this.gameManager.getGameByRoomId(roomId);

    if (this.gameManager.isGameByRoomId(roomId) == false) {
      this.WsLogger.log(`Game ${roomId} is not exist`);
      return;
    }
    // TODO
    // 1. 게임에 참여한 유저인지 확인한다.
    if (game.isClientReady(data.user.id)) {
      game.cancelReady(data.user.id);
      this.WsLogger.log(`User ${data.user.name} cancel ready`);
    } else {
      game.setReady(data.user.id);
      this.WsLogger.log(`User ${data.user.name} is ready`);
    }
    if (game.isReady()) {
      game.setGameStatus(GameStatus.Play);
      this.server.to(roomId).emit('startGame');
      this.WsLogger.log(`Game ${roomId} started`);
    }
  }

  @SubscribeMessage('setGame')
  async gaming(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomId: string,
  ) {
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
    } else if (game.getGameStatus() == GameStatus.Play) {
      const score = game.getScore();
      if (score[0] >= 10 || score[1] >= 10) {
        game.setGameStatus(GameStatus.End);
        this.gameManager.removeGame(roomId);
        // TODO: 게임 종료 후 DB에 저장
        // this.gameService.updateGameState(game);
      }
    } else if (game.getGameStatus() == GameStatus.End) {
      game.setGameStatus(GameStatus.Wait);
    }

    client.emit('setGame', game);
  }

  @SubscribeMessage('postKey')
  async getKey(@ConnectedSocket() client: Socket, @MessageBody() key: string) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('postKey', 'disconnected');
      throw new WsException('Unauthorized');
    }
    const data = client.data;

    const roomId = data.roomId;
    const game = this.gameManager.getGameByRoomId(roomId);
    const paddle = game.getPaddleByUserId(data.user.name);

    if (key === 'up') {
      paddle.setKeyUp();
    } else if (key === 'down') {
      paddle.setKeyDown();
    }
  }
}
