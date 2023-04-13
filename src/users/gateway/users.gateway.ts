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
import { UsersService } from '../users.service';
import { Status } from '../enum/status.enum';
import { UserEntity } from '../entities/user.entity';
import { FriendShipStatus } from '../enum/friendShipStatus.enum';

@WebSocketGateway({
  namespace: 'users',
  cors: {
    origin: 'http://localhost:4000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly usersLogger = new Logger('UsersGateway');
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  async handleDisconnect(client: Socket) {
    this.usersLogger.debug('disconnect');
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      return;
    }

    const allSockets = await this.server.fetchSockets();
    for (const socket of allSockets) {
      if (socket.data?.user?.id === user.id) {
        return;
      }
    }
    await this.setActiveStatus(client, Status.OFFLINE);
  }

  async handleConnection(client: Socket) {
    this.usersLogger.debug('connect');

    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      this.handleDisconnect(client);
      return;
    }
    client.data.user = user;
    await this.setActiveStatus(client, Status.ONLINE);
  }

  private async emitStatusToFriends(client: Socket, activeUser: UserEntity) {
    const friends = await this.usersService.getFriendList(
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
  }

  private async setActiveStatus(client: Socket, status: Status) {
    const user = client.data?.user;

    if (!user) {
      return;
    }
    await this.usersService.updateUserStatus(user, status);
    await this.emitStatusToFriends(client, user);
  }

  @SubscribeMessage('updateActiveStatus')
  async updateActiveStatus(client: Socket, status: Status) {
    this.usersLogger.debug('updateActiveStatus');
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
    this.usersLogger.debug('addFriend');

    if (!client.data?.user) {
      return;
    }
    await this.usersService.addFriend(client.data.user, friendName);
    const allSockets = await this.server.fetchSockets();
    for (const socket of allSockets) {
      if (socket.data?.user?.name === friendName) {
        this.server.to(socket.id).emit('friendRequest', client.data.user);
      }
    }
  }

  @SubscribeMessage('acceptFriendRequest')
  async acceptFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody('friendName') friendName: string,
  ) {
    this.usersLogger.debug('acceptFriendRequest');

    if (!client.data?.user) {
      return;
    }
    const friends = await this.usersService.getFriendList(
      client.data.user,
      FriendShipStatus.PENDING,
    );
    for (const f of friends) {
      if (f.name === friendName) {
        await this.usersService.acceptFriendRequest(client.data.user, f.id);
        const allSockets = await this.server.fetchSockets();
        for (const socket of allSockets) {
          if (socket.data?.user?.name === friendName) {
            this.server.to(socket.id).emit('friendAccepted', client.data.user);
          }
        }
      }
    }
  }

  @SubscribeMessage('rejectFriendRequest')
  async rejectFriendRequest(
    client: Socket,
    @MessageBody('friendName') friendName: string,
  ) {
    if (!client.data?.user) {
      return;
    }
    const friends = await this.usersService.getFriendList(
      client.data.user,
      FriendShipStatus.PENDING,
    );
    for (const f of friends) {
      if (f.name === friendName) {
        await this.usersService.rejectFriendRequest(client.data.user, f.id);
      }
    }
  }
}
