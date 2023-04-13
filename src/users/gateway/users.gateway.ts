import { Logger } from '@nestjs/common';
import {
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
    let socketCnt = 0;
    if (!user) {
      this.handleDisconnect(client);
      return;
    }

    const allSockets = await this.server.fetchSockets();
    for (const socket of allSockets) {
      if (socket.data?.user?.id === user.id) {
        socketCnt++;
      }
      if (socketCnt > 1) {
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
    const friends = await this.usersService.getFriendList(activeUser);
    const friendList = new Array<UserEntity>();
    console.log(friends);

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
    this.usersLogger.debug('friendList', friendList);
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
}
