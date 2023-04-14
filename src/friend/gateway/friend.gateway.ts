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
import { FriendShipStatus } from '../enum/friendShipStatus.enum';
import { FriendService } from '../friend.service';

// NOTE: namespace will be changed to '/friend'
@WebSocketGateway({
  namespace: 'users',
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

    const allSockets = await this.server.fetchSockets();
    for (const socket of allSockets) {
      if (socket.data?.user?.id === client.data.user.id) {
        return;
      }
    }
    await this.setActiveStatus(client, Status.OFFLINE);
  }

  async handleConnection(client: Socket) {
    const user = await this.authService.getUserBySocket(client);

    this.friendWsLogger.debug(`connect ${user?.name}`);
    if (!user) {
      this.friendWsLogger.debug('user not found');
      this.handleDisconnect(client);
      return;
    }
    client.data.user = user;
    await this.setActiveStatus(client, Status.ONLINE);
  }

  @SubscribeMessage('updateActiveStatus')
  async updateActiveStatus(client: Socket, status: Status) {
    this.friendWsLogger.debug('updateActiveStatus');

    if (!client.data?.user) {
      return;
    }
    await this.setActiveStatus(client, status);
  }

  @SubscribeMessage('addFriend')
  async addFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody('friendName') friendName: string,
  ) {
    this.friendWsLogger.debug('addFriend');

    if (!client.data?.user) {
      return;
    }
    await this.friendService.addFriend(client.data.user, friendName);
    const allSockets = await this.server.fetchSockets();
    for (const socket of allSockets) {
      if (socket.data?.user?.name === friendName) {
        this.server
          .to(socket.id)
          .emit(
            'friendRequest',
            await this.friendService.getFriendRequestList(socket.data.user),
          );
      }
    }
  }

  @SubscribeMessage('acceptFriendRequest')
  async acceptFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody('friendName') friendName: string,
  ) {
    this.friendWsLogger.debug('acceptFriendRequest');

    if (!client.data?.user) {
      return;
    }
    const friend = await this.usersService.getUserByName(friendName);

    if (!friend) {
      return;
    }
    const friends = await this.friendService.getFriendList(
      client.data.user,
      FriendShipStatus.PENDING,
    );
    for (const f of friends) {
      if (f.name === friend.name) {
        await this.friendService.acceptFriendRequest(client.data.user, friend);
        const allSockets = await this.server.fetchSockets();
        for (const socket of allSockets) {
          if (socket.data?.user?.name === friendName) {
            this.server.to(socket.id).emit('friendActive', client.data.user);
          }
        }
      }
    }
    this.server.to(client.id).emit('friendActive', friend);
  }

  @SubscribeMessage('rejectFriendRequest')
  async rejectFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody('friendName') friendName: string,
  ) {
    if (!client.data?.user) {
      return;
    }

    const friend = await this.usersService.getUserByName(friendName);
    if (!friend) {
      return;
    }

    const friends = await this.friendService.getFriendList(
      client.data.user,
      FriendShipStatus.PENDING,
    );
    for (const f of friends) {
      if (f.name === friend.name) {
        await this.friendService.removeFriendShip(client.data.user, friend);
      }
    }
  }

  @SubscribeMessage('deleteFriend')
  async deleteFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody('friendName') friendName: string,
  ) {
    if (!client.data?.user) {
      return;
    }

    const friend = await this.usersService.getUserByName(friendName);
    if (!friend) {
      return;
    }

    const friends = await this.friendService.getFriendList(
      client.data.user,
      FriendShipStatus.ACCEPTED,
    );
    for (const f of friends) {
      if (f.name === friend.name) {
        await this.friendService.removeFriendShip(client.data.user, friend);
        const allSockets = await this.server.fetchSockets();
        for (const socket of allSockets) {
          if (socket.data?.user?.name === friendName) {
            this.server.to(socket.id).emit('friendActive', client.data.user);
          }
        }
      }
    }
    this.server.to(client.id).emit('friendActive', friend);
  }

  private async emitStatusToFriends(client: Socket, activeUser: UserEntity) {
    const friends = await this.friendService.getFriendList(
      activeUser,
      FriendShipStatus.ACCEPTED,
    );
    const friendList = new Array<UserEntity>();

    for (const f of friends) {
      const user = await this.usersService.getUserById(f.id);
      friendList.push(user);
      if (user.status === Status.OFFLINE) {
        continue;
      }
      const allSockets = await this.server.fetchSockets();
      for (const socket of allSockets) {
        if (socket.data?.user?.id === user.id) {
          this.server.to(socket.id).emit('friendActive', activeUser);
        }
      }
    }
    this.server.to(client.id).emit('friendList', friendList);
    this.server
      .to(client.id)
      .emit(
        'friendRequest',
        await this.friendService.getFriendRequestList(activeUser),
      );
  }

  async setActiveStatus(client: Socket, status: Status) {
    const user = client.data?.user;

    if (!user) {
      return;
    }
    await this.usersService.updateUserStatus(user, status);
    await this.emitStatusToFriends(client, user);
  }
}
