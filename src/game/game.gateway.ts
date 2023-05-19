import { Logger, UseFilters, UseGuards } from '@nestjs/common';
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
import { WsExceptionFilter } from 'src/util/filter/ws-exception.filter';
import { WsAuthGuard } from 'src/auth/guard/ws-auth.guard';
import { ErrorStatus } from './enum/error-status.enum';

@UseFilters(new WsExceptionFilter())
@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: 'game',
  cors: {
    origin: '*/lobby/overview',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly WsLogger = new Logger('GameGateway');

  constructor(
    private gameService: GameService,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  private gameManager: GameManager = new GameManager();

  async validateClient(client: Socket): Promise<UserEntity> {
    if (!client.data?.user.id) {
      throw new WsException('user not found');
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
    this.WsLogger.log(`handleConnection: ${client.id}`);

    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      this.WsLogger.error('[handleConnection] user not found');
      client.disconnect();
      return;
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

      return this.WsLogger.log(`[${user.name}] is already in [${roomId}]`);
    }

    client.data.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarImageUrl: user.avatarImageUrl,
    };

    client.join(GameStatus.LOBBY);
    client.data.roomId = GameStatus.LOBBY;
    client.emit('finishGame');
    this.gameManager.waitQueue.removeUser(user.id);

    this.WsLogger.log(`User [${user.name}] connected`);
  }

  async handleDisconnect(client: Socket) {
    this.WsLogger.log(`[hadleDisconnect] ${client.id}`);
  }

  @SubscribeMessage('isMatching')
  async isMatching(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      throw new WsException({
        status: ErrorStatus.FATAL,
        message: '연결이 끊겼습니다.',
      });
    }

    if (client.data.roomId != GameStatus.LOBBY) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '이미 매칭 중 입니다..',
      });
    }
  }

  @SubscribeMessage('postMatching')
  async postMatching(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      throw new WsException({
        status: ErrorStatus.FATAL,
        message: '연결이 끊겼습니다.',
      });
    }

    // 이미 매칭중이라면, 다른 웹 브라우저를 열어서 접속 했을 경우
    const roomId = await this.gameService.getRoomIdByUserId(
      client.data.user.id,
    );
    if (roomId) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '이미 매칭 중입니다.',
      });
    }

    const allSockets = await this.server.in(GameStatus.MATCHING).fetchSockets();
    if (allSockets.length >= MAX_QUEUE_SIZE) {
      return new WsException({
        status: ErrorStatus.WARNING,
        message: '매칭 대기열이 꽉 찼습니다.',
      });
    }

    // 이미 매칭중인 유저라면 중복 매칭시 실패
    let flag = false;
    allSockets.forEach((socket) => {
      if (socket.data.user.id == client.data.user.id) {
        flag = true;
        return;
      }
    });
    if (flag != false) {
      return new WsException({
        status: ErrorStatus.WARNING,
        message: '이미 매칭 중입니다.',
      });
    }

    client.leave(GameStatus.LOBBY);
    client.join(GameStatus.MATCHING);
    client.data.roomId = GameStatus.MATCHING;
    this.gameManager.waitQueue.addUser(client.data.user.id);
    this.WsLogger.log(`User ${client.id}: matching`);
  }

  @SubscribeMessage('postCancelMatching')
  async leaveWait(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      throw new WsException({
        status: ErrorStatus.FATAL,
        message: '연결이 끊겼습니다.',
      });
    }

    client.leave(GameStatus.MATCHING);
    client.join(GameStatus.LOBBY);
    client.data.roomId = GameStatus.LOBBY;
    this.gameManager.waitQueue.removeUser(client.data.user.id);
    this.WsLogger.log(`${client.data.user.name} is leave match`);
  }

  @SubscribeMessage('postDeleteGame')
  async postDeleteGame(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      throw new WsException({
        status: ErrorStatus.FATAL,
        message: '연결이 끊겼습니다.',
      });
    }

    const roomId = await this.gameService.getRoomIdByUserId(
      client.data.user.id,
    );
    if (roomId != null) {
      // 처음 게임방을 나가는 경우 게임방을 삭제한다.
      // 게임방에 입장해 있는 유저들에게 게임방을 나가라고 알린다.
      const game = this.gameManager.getGameByRoomId(roomId);
      if (game) {
        this.gameManager.deleteGameByRoomId(roomId);
        if (game.getGameStatus() == GameStatus.WAIT) {
          await this.gameService.deleteGameByRoomId(game.getRoomId());
        }
        this.server.to(roomId).emit('postDeleteGame', null);
        return;
      }
    }
  }

  @SubscribeMessage('postLeaveGame')
  async postLeaveGame(@ConnectedSocket() client: Socket, @MessageBody() body) {
    this.WsLogger.log(`[postLeaveGame] ${client.id}`);

    const data = client.data;
    client.leave(GameStatus.MATCHING);

    if (client.data.roomId == GameStatus.LOBBY) {
      return new WsException({
        status: ErrorStatus.WARNING,
        message: '게임방에 입장해 있지 않습니다.',
      });
    }

    // 게임방에 입장해 있는 경우
    client.leave(client.data.roomId);
    client.join(GameStatus.LOBBY);
    client.data.roomId = GameStatus.LOBBY;
    if (body == 'finishGame') {
      client.emit('postLeaveGame', 'finishGame');
    } else {
      client.emit('postLeaveGame');
    }
    this.WsLogger.log(
      `[postLeaveGame] User [${data.user.name}] left game [${client.data.roomId}]`,
    );
  }

  @SubscribeMessage('postReadyGame')
  async postReady(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      throw new WsException({
        status: ErrorStatus.FATAL,
        message: '연결이 끊겼습니다.',
      });
    }
    const data = client.data;

    const roomId = data.roomId;

    if (this.gameManager.isGameByRoomId(roomId) == false) {
      this.WsLogger.log(`Game ${roomId} is not exist`);
      return;
    }
    const game = this.gameManager.getGameByRoomId(roomId);

    if (game.isClientReady(data.user.name)) {
      game.cancelReady(data.user.name);
      this.WsLogger.log(`User ${data.user.name} cancel ready`);
    } else {
      game.pushReady(data.user.name);
      this.WsLogger.log(`User ${data.user.name} is ready`);
    }
    this.server.to(roomId).emit('getWhoReady', game.getWhoReady());
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
      throw new WsException({
        status: ErrorStatus.FATAL,
        message: '연결이 끊겼습니다.',
      });
    }

    const data = client.data;
    const roomId = data.roomId;
    const game = this.gameManager.getGameByRoomId(roomId);
    const ball = game.getBall();

    if (difficulty == 'hard') {
      game.pushDifficulty(data.user.id);
    } else if (difficulty == 'normal') {
      game.cancelDifficulty(data.user.id);
    }
    if (game.isDifficulty()) {
      ball.setSpeed(GameVariable.hardBallSpeed);
      game.setDifficulty(GameVariable.hardDifficulty);
    } else if (!game.isDifficulty()) {
      ball.setSpeed(GameVariable.normalBallSpeed);
      game.setDifficulty(GameVariable.normalDifficulty);
    }
  }

  @SubscribeMessage('postChangeScore')
  async postChangeScore(
    @ConnectedSocket() client: Socket,
    @MessageBody() changeScore: string,
  ) {
    if (!client.data?.user) {
      throw new WsException({
        status: ErrorStatus.FATAL,
        message: '연결이 끊겼습니다.',
      });
    }

    const data = client.data;
    const roomId = data.roomId;
    const game = this.gameManager.getGameByRoomId(roomId);

    if (changeScore == 'hard') {
      game.pushChangeScore(data.user.id);
    } else if (changeScore == 'normal') {
      game.cancelDifficulty(data.user.id);
    }
    if (game.isChangeScore()) {
      game.setFinalScore(GameVariable.hardFinalScore);
    } else if (!game.isChangeScore()) {
      game.setFinalScore(GameVariable.normalFinalScore);
    }
  }

  @SubscribeMessage('postKey')
  async getKey(@ConnectedSocket() client: Socket, @MessageBody() key: string) {
    if (!client.data?.user) {
      throw new WsException({
        status: ErrorStatus.FATAL,
        message: '연결이 끊겼습니다.',
      });
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
  async inviteUserForGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() inviteUserNameDto: InviteUserNameDto,
  ) {
    const senderUser = await this.validateClient(client);

    const receiverUser = await this.validateInvitedUser(
      inviteUserNameDto.userName,
    );

    this.WsLogger.log(
      `[inviteUserForGame] ${senderUser.name}:${senderUser.id} invite ${receiverUser.name}:${receiverUser.id}`,
    );

    // 이미 매칭중이라면, 다른 웹 브라우저를 열어서 접속 했을 경우
    const receiveRoomId = await this.gameService.getRoomIdByUserId(
      receiverUser.id,
    );
    if (receiveRoomId) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '이미 매칭중입니다.',
      });
    }

    const senderRoomId = await this.gameService.getRoomIdByUserId(
      senderUser.id,
    );
    if (senderRoomId) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '이미 매칭중입니다.',
      });
    }

    const title = `${senderUser.name}-${receiverUser.name}`;
    const newRoomId = uuid.v4();

    client.leave(GameStatus.LOBBY);
    client.leave(GameStatus.MATCHING);
    this.gameManager.waitQueue.removeUser(senderUser.id);
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
      client.emit('getMatching', 'matching', 'invite', newRoomId);
      await this.emitEventToActiveUser(
        receiverUser,
        'requestMatching',
        senderUser,
      );
    }
  }

  @SubscribeMessage('acceptMatchingRequest')
  async acceptMatchingRequest(@ConnectedSocket() client: Socket) {
    const roomId = await this.gameService.getRoomIdByUserId(
      client.data.user.id,
    );
    if (!roomId) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '대기중인 방이 없습니다.',
      });
    }
    this.WsLogger.log(
      `[acceptMatchingRequest] ${client.data.user.name} -> ${roomId}`,
    );
    client.leave(GameStatus.LOBBY);
    client.leave(GameStatus.MATCHING);
    this.gameManager.waitQueue.removeUser(client.data.user.id);
    client.join(roomId);
    client.data.roomId = roomId;
    client.emit('getMatching', 'matching', 'matching', roomId);
    client.to(roomId).emit('getMatching', 'matching', 'okInvite', roomId);
  }

  private async emitEventToActiveUser(
    user: UserEntity,
    event: string,
    data: any,
  ) {
    this.WsLogger.debug(`emitEventToActiveUser: ${user.id}`);
    // const allSockets = await this.server.in(GameStatus.LOBBY).fetchSockets();
    const allSockets = await this.server.fetchSockets();
    for (const socket of allSockets) {
      this.WsLogger.debug(
        `event: ${socket.data?.user.id}, ${user.id}`,
        socket.data?.user.id === user.id,
      );
      if (socket.data?.user.id === user.id) {
        socket.emit(event, data);
        return;
      }
    }
  }
}
