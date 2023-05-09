import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { UsersService } from 'src/users/users.service';
import { GameService } from './game.service';
import { GameManager } from './classes/gameManager.class';
import {
  GAME_FRAME,
  MAX_QUEUE_SIZE,
  SET_INTERVAL_TIME,
} from './constants/game.constant';
import { GameStatus, GameVariable } from './constants/gameVariable';
import { InviteUserNameDto } from './dto/invite-user-name.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import * as uuid from 'uuid';
import { instrument } from '@socket.io/admin-ui';
import { WsExceptionFilter } from 'src/util/filter/ws-exception.filter';

@UseFilters(new WsExceptionFilter())
@WebSocketGateway({
  namespace: 'game',
  cors: {
    origin: 'http://localhost:4000/lobby/overview',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  afterInit() {
    instrument(this.server, {
      // readonly: true,
      auth: false,
      mode: 'development',
      namespaceName: '/game',
    });
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly WsLogger = new Logger('GameWsLogger');

  constructor(
    private gameService: GameService,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  private gameManager: GameManager = new GameManager();

  async validateClient(client: Socket): Promise<UserEntity> {
    if (!client.data?.user.id) {
      throw new WsException('user not found in socket');
    }

    const user = await this.usersService.getUserById(client.data.user.id);
    if (!user) {
      throw new WsException('user not found in database');
    }
    return user;
  }

  async validateInvitedUser(userName: string): Promise<UserEntity> {
    const invitedUser = await this.usersService.getUserByName(userName);
    if (!invitedUser) {
      throw new WsException('invitedUser not found');
    }
    return invitedUser;
  }

  afterInit() {
    this.WsLogger.log('afterInit');

    setInterval(async () => {
      await this.gameService.createGame(this.server, this.gameManager);
    }, SET_INTERVAL_TIME);

    setInterval(async () => {
      this.gameManager.sendGame(
        this.server,
        this.gameService,
        this.usersService,
      );
    }, GAME_FRAME);
  }

  async handleConnection(client: Socket) {
    this.WsLogger.debug(`handleConnection: ${client.id}, ${client.data}`);
    // console.log(`복구: ${client.recovered}`);

    // TODO
    // // 1. 이전에 로그인한 유저인지 확인한다.
    // if (client.data?.user) {
    //   this.WsLogger.debug(
    //     `User ${client.data.user.id}: [${client.data.user.name}] is already in game`,
    //   );
    //   return;
    // }

    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      return;
    }

    // 이미 접속한 유저라면
    const roomId = await this.gameService.getRoomIdByUserId(user.id);
    if (roomId) {
      // TODO
      // 1. 이미 접속한 유저라면, overview로 보낸다.

      client.join(roomId);
      // REFACTOR
      // 1. user 로 바로 받는다 (@exclude 사용)
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
    // socketio 에서 재접속 설정을 했을 경우. (설정하고 확인해보기)
    // if (client.data?.user) {
    //   this.WsLogger.debug(
    //     `User ${client.data.user.id}: ${client.data.user.name} is already in lobby`,
    //   );
    //   return;
    // }

    client.data.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarImageUrl: user.avatarImageUrl,
    };

    // client.leave(client.id);
    client.join(GameStatus.LOBBY);
    client.data.roomId = GameStatus.LOBBY;
    client.emit('getGameHistory');
    // 로비에 있는 유저들에게 새로운 유저가 입장했다고 알린다. (로비에서 로비뷰에 있는 유저들 표시가 필요, 없으면 삭제)
    // this.server.to(GameStatus.LOBBY).emit('connectUser', client.data.user.name);
    this.WsLogger.log(`User [${user.name}] connected`);
  }

  async handleDisconnect(client: Socket) {
    //TODO
    // 1. 자동 매칭 신청한 유저 처리
    client.leave(GameStatus.MATCHING);
    client.emit('getCancelMatching');
    // 2. 게임 방에서 대기중인 유저 처리
    client.leave(client.data.roomId);
    client.emit('getLeaveGame', 'delete');
    client.emit('getLeaveGame', 'leave');

    // client.emit('kickUser');

    this.WsLogger.debug(`client disconnected: : ${client.id}`);
  }

  @SubscribeMessage('postMatching')
  async postMatching(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('getMatching', 'disconnected');
      throw new WsException('Unauthorized');
    }

    // 이미 매칭중이라면, 다른 웹 브라우저를 열어서 접속 했을 경우
    const roomId = await this.gameService.getRoomIdByUserId(
      client.data.user.id,
    );
    if (roomId) {
      client.emit('getMatching', 'already');
      this.WsLogger.log(`User ${client.id}: already matching`);
      throw new WsException('User in room id');
    }

    const allSockets = await this.server.in(GameStatus.MATCHING).fetchSockets();
    if (allSockets.length >= MAX_QUEUE_SIZE) {
      client.emit('getMatching', 'full');
      return;
    }

    // console.log('client.data.roomId', client.data.roomId);
    let flag = false;
    allSockets.forEach((socket) => {
      // console.log('socket.data.roomId', socket.data.roomId);
      if (socket.data.user.id == client.data.user.id) {
        flag = true;
        return;
      }
    });
    if (flag != false) {
      client.emit('getMatching', 'already');
      return;
    }

    client.leave(GameStatus.LOBBY);
    client.join(GameStatus.MATCHING);
    client.data.roomId = GameStatus.MATCHING;
    this.WsLogger.log(`User ${client.id}: matching`);
  }

  @SubscribeMessage('postCancelMatching')
  async leaveWait(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('getMatching', 'disconnected');
      throw new WsException('Unauthorized');
    }

    client.leave(GameStatus.MATCHING);
    client.join(GameStatus.LOBBY);
    client.data.roomId = GameStatus.LOBBY;
    const playerName = client.data.user.name;
    this.WsLogger.log(`${playerName} is leave match`);
  }

  @SubscribeMessage('postLeaveGame')
  async postLeaveGame(@ConnectedSocket() client: Socket) {
    // TODO
    // 1. 유저가 게임에 참여하고 있는지 확인한다.
    // 2. 게임이 대기상태이면 게임방을 나간다.
    // 3. 유저가 로비에 있는지 확인한다.

    if (!client.data?.user) {
      client.disconnect();
      client.emit('postLeaveGame', 'disconnected');
      throw new WsException('Unauthorized');
    }
    const data = client.data;

    const roomId = await this.gameService.getRoomIdByUserId(
      client.data.user.id,
    );
    if (roomId == GameStatus.LOBBY) {
      this.WsLogger.log(`User ${client.id} not in game`);
      client.emit('postLeaveGame', 'not in game');
      return;
    }

    // 처음 게임방을 나가는 경우 게임방을 삭제한다.
    // 게임방에 입장해 있는 유저들에게 게임방을 나가라고 알린다.
    const game = this.gameManager.getGameByRoomId(roomId);
    if (game) {
      this.gameManager.deleteGameByRoomId(roomId);
      if (game.getGameStatus() == GameStatus.WAIT) {
        await this.gameService.deleteGameByRoomId(game.getRoomId());
      }
      this.server.to(roomId).emit('postLeaveGame', 'delete');
      return;
    }

    // 게임방에 입장해 있는 경우
    client.leave(roomId);
    client.join(GameStatus.LOBBY);
    client.data.roomId = GameStatus.LOBBY;
    client.emit('postLeaveGame', 'leave');
    this.WsLogger.log(`User [${data.user.name}] left game [${roomId}]`);
  }

  @SubscribeMessage('postReadyGame')
  async postReady(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      client.disconnect();
      client.emit('setStartGame', 'disconnected');
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
      game.setGameStatus(GameStatus.PLAY);
      this.gameService.updateGameStatus(roomId, GameStatus.PLAY);
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
      client.emit('setStartGame', 'disconnected');
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

  @SubscribeMessage('inviteUserForGame')
  // @UsePipes(ValidationPipe) // 이거 왜함?
  async inviteUserForGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() inviteUserNameDto: InviteUserNameDto,
  ) {
    try {
      const senderUser = await this.validateClient(client);

      // userName -> userId 로 변경하기
      const receiverUser = await this.validateInvitedUser(
        inviteUserNameDto.userName,
      );

      this.WsLogger.debug(
        `[inviteUserForGame] ${senderUser.name}:${senderUser.id} invite ${receiverUser.name}:${receiverUser.id}`,
      );

      const title = `${senderUser.name}-${receiverUser.name}`;
      const newRoomId = uuid.v4();

      client.leave(GameStatus.LOBBY);
      client.join(newRoomId);
      client.data.roomId = newRoomId;

      this.gameManager.createGame(newRoomId, title);
      const newGame = await this.gameService.saveGameState(
        newRoomId,
        title,
        senderUser,
        receiverUser,
      );
      if (newGame) {
        client.emit('getMatching', 'matching', newRoomId);
        await this.emitEventToActiveUser(
          receiverUser,
          'requestMatching',
          receiverUser,
        );
      }
    } catch (error) {
      this.WsLogger.error(`[inviteUserForGame] ${error.message}`);
    }
  }

  @SubscribeMessage('acceptMatchingRequest')
  async acceptMatchingRequest(@ConnectedSocket() client: Socket) {
    try {
      const roomId = await this.gameService.getRoomIdByUserId(
        client.data.user.id,
      );
      if (!roomId) {
        throw new WsException('Not found room id');
      }
      client.leave(GameStatus.LOBBY);
      client.join(roomId);
      client.data.roomId = roomId;
      client.emit('getMatching', 'matching', roomId);
    } catch (error) {
      // roomId가 없는 경우 대기중인 방이 없다는 메시지를 보낸다.
      this.WsLogger.error(`[acceptMatchingRequest] ${error.message}`);
    }
  }

  // @SubscribeMessage('rejectMatchingRequest')
  // async rejectMatchingRequest(@ConnectedSocket() client: Socket) {
  //   try {
  //     const roomId = await this.gameService.getRoomIdByUserId(
  //       client.data.user.id,
  //     );
  //     if (!roomId) {
  //       throw new WsException('Not found room id');
  //     }
  //     const senderUser = await this.server.in(roomId).fetchSockets();
  //     if (!senderUser) {
  //       throw new WsException('Not found sender user');
  //     }
  //     this.server.to(senderUser[0].id).emit('postLeaveGame');
  //   } catch (error) {
  //     // roomId가 없는 경우 대기중인 방이 없다는 메시지를 보낸다.
  //     this.WsLogger.error(`[acceptMatchingRequest] ${error.message}`);
  //   }
  // }

  private async emitEventToActiveUser(
    user: UserEntity,
    event: string,
    data: any,
  ) {
    // 해당 유저가 접속되어 있는 모든 소켓에게 이벤트 전송
    const allSockets = await this.server.in(GameStatus.LOBBY).fetchSockets();
    // const allSockets = await this.server.fetchSockets();
    for (const socket of allSockets) {
      this.WsLogger.debug(
        `event: ${socket.data?.user.id}, ${user.id}`,
        socket.data?.user.id === user.id,
      );
      if (socket.data?.user.id === user.id) {
        // console.log(socket.data?.user.id, socket.id);
        this.server.to(socket.id).emit(event, data);
        // return;
      }
    }
  }
}
