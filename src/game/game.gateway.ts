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
import { GameStatus, GameVariable } from './constants/gameVariable';

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
      this.gameManager.sendGame(this.server, this.gameService);
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
      // REFACTOR
      // 1. user 로 바로 받는다 (@exlude 사용)
      client.data.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarImageUrl: user.avatarImageUrl,
      };
      // client.data.user = user;
      // console.log('User', client.data.user);
      client.data.roomId = roomId;
      // TODO
      // 1. 프론트로 현재 진행중인 게임 방 접속해야 한다.
      // client.emit('startGame', roomId);
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
    //TODO
    // 1. 자동 매칭 신청한 유저 처리
    client.leave('matching');
    client.emit('getCancelMatching');
    // 2. 게임 방에서 대기중인 유저 처리
    client.leave(client.data.roomId);
    client.emit('getLeaveGame', 'delete');
    client.emit('getLeaveGame', 'leave');

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

  @SubscribeMessage('postCancelMatching')
  async leaveWait(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('getMatching', 'disconnected');
      throw new WsException('Unauthorized');
    }

    client.leave('matching');
    client.join('lobby');
    client.emit('getCancelMatching');
    const playerName = client.data.user.name;
    this.WsLogger.log(`${playerName} is leave wait`);
  }

  @SubscribeMessage('joinSpectatorGame')
  async joinSpectatorGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomId: string,
  ) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('postKey', 'disconnected');
      throw new WsException('Unauthorized');
    }

    this.server.to(roomId).emit('joinGame', client.data.user);
    client.leave('lobby');
    client.join(roomId);
    client.data.roomId = roomId;

    // 게임에 참여하고 있는 유저들에게 새로운 유저가 입장했다고 알린다.
    // 해당 유저는 게임에 참여해야 한다.
    client.emit('joinSpectatorGame');
  }

  @SubscribeMessage('postLeaveGame')
  async postLeaveGame(@ConnectedSocket() client: Socket) {
    // TODO
    // 1. 유저가 게임에 참여하고 있는지 확인한다.
    // 2. 게임이 대기상태이면 게임방을 나간다.
    // 3. 유저가 로비에 있는지 확인한다.

    if (!client.data?.user) {
      client.disconnect();
      client.emit('postKey', 'disconnected');
      throw new WsException('Unauthorized');
    }
    const data = client.data;

    const roomId = data.roomId;
    if (client.data.roomId == 'lobby') {
      this.WsLogger.log(`User ${client.id} not in game`);
      client.emit('postLeaveGame', 'not in game');
      return;
    }

    // 처음 게임방을 나가는 경우 게임방을 삭제한다.
    // 게임방에 입장해 있는 유저들에게 게임방을 나가라고 알린다.
    const game = this.gameManager.getGameByRoomId(roomId);
    if (game != null) {
      this.gameManager.deleteGameByRoomId(roomId);
      if (game.getGameStatus() == GameStatus.Wait) {
        await this.gameService.deleteGameByRoomId(game.getRoomId());
      }
      this.server.to(roomId).emit('postLeaveGame', 'delete');
      return;
    }

    // 게임방에 입장해 있는 경우
    client.leave(roomId);
    client.join('lobby');
    client.data.roomId = 'lobby';
    client.emit('postLeaveGame', 'leave');
    this.WsLogger.log(`User [${data.user.name}] left game [${roomId}]`);
  }

  @SubscribeMessage('postReadyGame')
  async postReady(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('postKey', 'disconnected');
      throw new WsException('Unauthorized');
    }
    const data = client.data;

    const roomId = data.roomId;

    if (this.gameManager.isGameByRoomId(roomId) == false) {
      this.WsLogger.log(`Game ${roomId} is not exist`);
      return;
    }
    const game = this.gameManager.getGameByRoomId(roomId);
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
      this.server.to(roomId).emit('setStartGame', 'start');
      this.WsLogger.log(`Game ${roomId} started`);
    }
  }

  @SubscribeMessage('postDifficulty')
  async postDifficulty(
    @ConnectedSocket() client: Socket,
    @MessageBody() difficulty: string,
  ) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('postKey', 'disconnected');
      throw new WsException('Unauthorized');
    }

    const data = client.data;
    const roomId = data.roomId;
    const game = this.gameManager.getGameByRoomId(roomId);
    const ball = game.getBall();

    if (difficulty == 'hard') {
      game.setDifficulty(data.user.id);
    } else if (difficulty == 'normal') {
      game.cancelDifficulty(data.user.id);
    }
    if (game.isDifficulty()) {
      ball.setSpeed(GameVariable.hardBallSpeed);
    } else if (!game.isDifficulty()) {
      ball.setSpeed(GameVariable.normalBallSpeed);
    }
  }

  @SubscribeMessage('postWatching')
  async postWatching(
    @ConnectedSocket() client: Socket,
    @MessageBody() title: string,
  ) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('postKey', 'disconnected');
      throw new WsException('Unauthorized');
    }
    const roomId = await this.gameService.getRoomIdByTitle(title);
    if (!roomId) {
      client.emit('postWatching', 'disconnected');
      this.WsLogger.log(`User ${client.data.name} not in game`);
    }
    client.join(roomId);
    // 3. 게임방에 있는 유저들에게 새로운 유저가 입장했다고 알린다.
    const game = this.gameManager.getGameByRoomId(roomId);
    if (game) {
      this.WsLogger.log(`Not exist game [${roomId}]`);
    }
    game.addWatcher(client.data.user.id);
    this.server.to(roomId).emit('getWatching', game.getWatcher());
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
