import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { Status } from 'src/users/enum/status.enum';
import { UsersService } from 'src/users/users.service';
import { FriendService } from '../friend.service';

@WebSocketGateway({
  namespace: 'friend',
  cors: {
    origin: 'http://localhost:4000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class FriendGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly friendWsLogger = new Logger('FriendGateway');
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private friendService: FriendService,
  ) {}

  async handleDisconnect(client: Socket) {
    if (!client.data?.user) {
      return;
    }
    this.friendWsLogger.debug(`disconnect ${client.data.user.name}`);

    // 해당 socket의 유저가 다른 소켓에서 접속되어 있는지 확인
    const allSockets = await this.server.fetchSockets();
    for (const socket of allSockets) {
      if (socket.data?.user?.id === client.data.user.id) {
        return;
      }
    }
    // 다른 소켓에서 접속되어 있지 않다면, 유저의 상태를 OFFLINE으로 변경
    await this.setActiveStatus(client, client.data.user, Status.OFFLINE);
  }

  async handleConnection(client: Socket) {
    // socket 연결 시, 해당 socket의 유저 인증 후 유저 정보 리턴
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      this.friendWsLogger.debug('[handleConnection] user not found');
      client.disconnect();
      return;
    }
    this.friendWsLogger.debug(`connect ${user?.name}`);
    client.data.user = user;
    // 유저의 상태를 ONLINE으로 변경
    await this.setActiveStatus(client, user, Status.ONLINE);
  }

  @SubscribeMessage('updateActiveStatus')
  async updateActiveStatus(client: Socket, status: Status) {
    if (!client.data?.user) {
      return;
    }
    this.friendWsLogger.debug(
      `[updateActiveStatus event] client: ${client.data.user.name} status: ${status}`,
    );
    // 유저의 상태를 status로 변경
    await this.setActiveStatus(client, client.data.user, status);
  }

  @SubscribeMessage('addFriend')
  async addFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody('friendName') friendName: string,
  ) {
    this.friendWsLogger.debug(`[addFriend event] friendName: ${friendName}`);

    if (!client.data?.user) {
      this.friendWsLogger.debug('[addFriend] user not found');
      return;
    }

    const friend = await this.usersService.getUserByName(friendName);
    if (!friend) {
      this.friendWsLogger.debug('[addFriend] friend not found');
      return;
    }

    // PENDING 상태로 FriendShip 생성 후, 친구에게 친구 요청 이벤트 전송
    await this.friendService.addFriend(client.data.user, friend);
    const requestFriendList = await this.friendService.getFriendRequestList(
      friend,
    );
    await this.emitEventToActiveUser(
      friend,
      'friendRequest',
      requestFriendList,
    );
  }

  // TODO: add dto for friendName and validation pipe
  @SubscribeMessage('acceptFriendRequest')
  async acceptFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody('friendName') friendName: string,
  ) {
    this.friendWsLogger.debug(
      `[acceptFriendRequest event] friendName: ${friendName}`,
    );

    const user = client.data?.user;
    if (!user) {
      this.friendWsLogger.debug('[acceptFriendRequest] user not found');
      return;
    }

    const friend = await this.usersService.getUserByName(friendName);
    if (!friend) {
      this.friendWsLogger.debug('[acceptFriendRequest] friend not found');
      return;
    }

    // ACCEPT 상태로 FriendShip 변경 후, 친구와 나에게 친구목록 변경 이벤트 전송
    await this.friendService.acceptFriendRequest(user, friend);
    await this.emitEventToActiveUser(friend, 'friendRenew', user);
    this.server.to(client.id).emit('friendRenew', friend);
    const reqeustFriends = await this.friendService.getFriendList(user);
    await this.emitEventToActiveUser(user, 'friendRequest', reqeustFriends);
  }

  @SubscribeMessage('rejectFriendRequest')
  async rejectFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody('friendName') friendName: string,
  ) {
    const user = client.data?.user;
    if (!user) {
      return;
    }

    const friend = await this.usersService.getUserByName(friendName);
    if (!friend) {
      return;
    }

    // PENDING 상태인 FriendShip 삭제
    await this.friendService.removeFriendShip(client.data.user, friend);
    const reqeustFriends = await this.friendService.getFriendList(user);
    await this.emitEventToActiveUser(user, 'friendRequest', reqeustFriends);
  }

  @SubscribeMessage('deleteFriend')
  async deleteFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody('friendName') friendName: string,
  ) {
    this.friendWsLogger.debug(`[deleteFriend event] friendName: ${friendName}`);

    const user = client.data?.user;
    if (!user) {
      this.friendWsLogger.debug('[deleteFriend] user not found');
      return;
    }

    const friend = await this.usersService.getUserByName(friendName);
    if (!friend) {
      this.friendWsLogger.debug('[deleteFriend] friend not found');
      return;
    }

    // 친구와 나에게 친구목록 변경 이벤트 전송 후 FriendShip 삭제
    await this.emitEventToActiveUser(friend, 'friendRenew', user);
    this.server.to(client.id).emit('friendRenew', friend);
    await this.friendService.removeFriendShip(client.data.user, friend);
  }

  private async emitEventToActiveUser(
    user: UserEntity,
    event: string,
    data: any,
  ) {
    // 해당 유저가 접속되어 있는 모든 소켓에게 이벤트 전송
    const allSockets = await this.server.fetchSockets();
    for (const socket of allSockets) {
      if (socket.data?.user.name === user.name) {
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
