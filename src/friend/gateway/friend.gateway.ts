import {
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { WsAuthGuard } from 'src/auth/guard/ws-auth.guard';
import { FriendNameDto } from 'src/users/dto/friend-name.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { Status } from 'src/users/enum/status.enum';
import { UsersService } from 'src/users/users.service';
import { getUserBySocket } from 'src/util/decorator/get-user-socket.decorator';
import { WsExceptionFilter } from 'src/util/filter/ws-exception.filter';
import { FriendService } from '../friend.service';

@UseFilters(new WsExceptionFilter())
@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: '/friend',
  cors: {
    origin: 'http://localhost:4000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class FriendGateway implements OnGatewayDisconnect, OnGatewayConnection {
  @WebSocketServer() server: Namespace;
  private readonly friendWsLogger = new Logger('FriendGateway');
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private friendService: FriendService,
  ) {}

  async validateClient(client: Socket): Promise<UserEntity> {
    if (!client.data?.userId) {
      throw new WsException('user not found');
    }

    const user = await this.usersService.getUserById(client.data.userId);
    if (!user) {
      throw new WsException('user not found');
    }
    return user;
  }

  async validateFriend(friendName: string): Promise<UserEntity> {
    const friend = await this.usersService.getUserByName(friendName);
    if (!friend) {
      throw new WsException('friend not found');
    }
    return friend;
  }

  async handleDisconnect(client: Socket) {
    try {
      const user = await this.validateClient(client);
      this.friendWsLogger.debug(`[handleDisconnect] ${user.name}`);

      // 해당 socket의 유저가 다른 소켓에서 접속되어 있는지 확인
      const allSockets = await this.server.fetchSockets();
      for (const socket of allSockets) {
        if (socket.data?.userId === client.data.userId) {
          return;
        }
      }
      // 다른 소켓에서 접속되어 있지 않다면, 유저의 상태를 OFFLINE으로 변경
      await this.setActiveStatus(client, user, Status.OFFLINE);
    } catch (error) {
      this.friendWsLogger.error(`[handleDisconnect] ${error.message}`);
    }
  }

  async handleConnection(client: Socket) {
    // socket 연결 시, 해당 socket의 유저 인증 후 유저 정보 리턴
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      this.friendWsLogger.debug('[handleConnection] user not found');
      client.disconnect();
      return;
    }
    this.friendWsLogger.debug(`connect ${user.name}`);
    client.data.userId = user.id;
    // 유저의 상태를 ONLINE으로 변경
    await this.setActiveStatus(client, user, Status.ONLINE);
  }

  @SubscribeMessage('updateActiveStatus')
  async updateActiveStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() status: Status,
    @getUserBySocket() user: UserEntity,
  ) {
    try {
      this.friendWsLogger.debug(
        `[updateActiveStatus event] client: ${user.name} status: ${status}`,
      );
      // 유저의 상태를 status로 변경
      await this.setActiveStatus(client, user, status);
    } catch (error) {
      this.friendWsLogger.error(`[updateActiveStatus] ${error.message}`);
    }
  }

  @UsePipes(ValidationPipe)
  @SubscribeMessage('addFriend')
  async addFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody() friendNameDto: FriendNameDto,
    @getUserBySocket() user: UserEntity,
  ) {
    try {
      const friend = await this.validateFriend(friendNameDto.friendName);

      this.friendWsLogger.debug(
        `[addFriend event] user: ${user.name} friendName: ${friendNameDto.friendName}`,
      );

      // PENDING 상태로 FriendShip 생성 후, 친구에게 친구 요청 이벤트 전송
      await this.friendService.addFriend(user, friend);

      const requestFriendList = await this.friendService.getFriendRequestList(
        friend,
      );
      await this.emitEventToActiveUser(
        friend,
        'friendRequest',
        requestFriendList,
      );
      return { status: true, message: 'ok' };
    } catch (error) {
      this.friendWsLogger.error(`[addFriend] ${error.message}`);
      return { status: false, message: error.message };
    }
  }

  @UsePipes(ValidationPipe)
  @SubscribeMessage('acceptFriendRequest')
  async acceptFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() friendNameDto: FriendNameDto,
    @getUserBySocket() user: UserEntity,
  ) {
    try {
      const friend = await this.validateFriend(friendNameDto.friendName);
      this.friendWsLogger.debug(
        `[acceptFriendRequest event] friendName: ${friendNameDto.friendName}`,
      );

      // ACCEPT 상태로 FriendShip 변경 후, 친구와 나에게 친구목록 조회 이벤트 전송
      await this.friendService.acceptFriendRequest(user, friend);
      await this.emitFriendListToAll(user, friend);
    } catch (error) {
      this.friendWsLogger.error(`[acceptFriendRequest] ${error.message}`);
    }
  }

  @SubscribeMessage('rejectFriendRequest')
  @UsePipes(ValidationPipe)
  async rejectFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() friendNameDto: FriendNameDto,
    @getUserBySocket() user: UserEntity,
  ) {
    try {
      const friend = await this.validateFriend(friendNameDto.friendName);
      this.friendWsLogger.debug(
        `[rejectFriendRequest event] user: ${user.name}
		friendName: ${friendNameDto.friendName}`,
      );
      // 이미 수락한 친구라면, 아무것도 하지 않음
      const isAccepted = await this.friendService.isAcceptedFriendShip(
        user,
        friend,
      );
      if (isAccepted) {
        return;
      }
      // PENDING 상태인 FriendShip 삭제
      await this.friendService.removeFriendShip(user, friend);
      await this.emitFriendListToAll(user, friend);
    } catch (error) {
      this.friendWsLogger.error(`[rejectFriendRequest] ${error.message}`);
    }
  }

  @SubscribeMessage('deleteFriend')
  @UsePipes(ValidationPipe)
  async deleteFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody() friendNameDto: FriendNameDto,
    @getUserBySocket() user: UserEntity,
  ) {
    try {
      const friend = await this.validateFriend(friendNameDto.friendName);
      this.friendWsLogger.debug(
        `[deleteFriend event] user: ${user.name}
		friendName: ${friendNameDto.friendName}`,
      );

      // 친구와 나에게 친구목록 변경 이벤트 전송 후 FriendShip 삭제
      await this.friendService.removeFriendShip(user, friend);
      await this.emitFriendListToAll(user, friend);
    } catch (error) {
      this.friendWsLogger.error(`[deleteFriend] ${error.message}`);
    }
  }

  private async emitFriendListToAll(user: UserEntity, friend: UserEntity) {
    const myFriendList = await this.friendService.getFriendList(user);
    const friendFriendList = await this.friendService.getFriendList(friend);
    const myFriendRequestList = await this.friendService.getFriendRequestList(
      user,
    );

    await this.emitEventToActiveUser(user, 'friendList', myFriendList);
    await this.emitEventToActiveUser(friend, 'friendList', friendFriendList);
    await this.emitEventToActiveUser(
      user,
      'friendRequest',
      myFriendRequestList,
    );
  }

  private async emitEventToActiveUser(
    user: UserEntity,
    event: string,
    data: any,
  ) {
    // 해당 유저가 접속되어 있는 모든 소켓에게 이벤트 전송
    const allSockets = await this.server.fetchSockets();
    for (const socket of allSockets) {
      if (socket.data?.userId === user.id) {
        this.server.to(socket.id).emit(event, data);
      }
    }
  }

  private async emitEventToAllFriends(
    user: UserEntity,
    event: string,
    data: any,
  ) {
    // 친구 목록을 가져와서 접속되어 있는 친구에게 이벤트 전송
    const friendList = await this.friendService.getFriendList(user);
    for (const friend of friendList) {
      if (friend.status === Status.OFFLINE) {
        continue;
      }
      await this.emitEventToActiveUser(friend, event, data);
    }
  }

  // 나에게 친구 목록과 친구 요청 목록을 전송
  private async emitFriendInfoToMe(client: Socket, user: UserEntity) {
    const friendList = await this.friendService.getFriendList(user);
    if (friendList.length) {
      this.server.to(client.id).emit('friendList', friendList);
    }
    this.server
      .to(client.id)
      .emit(
        'friendRequest',
        await this.friendService.getFriendRequestList(user),
      );
  }

  async setActiveStatus(client: Socket, user: UserEntity, status: Status) {
    await this.usersService.updateUserStatus(user, status);

    await this.emitEventToAllFriends(user, 'friendActive', user);

    if (status === Status.ONLINE) {
      await this.emitFriendInfoToMe(client, user);
    }
  }
}
