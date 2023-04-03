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
import { Cache } from 'cache-manager';
import { ActiveUser } from '../UserInfo';
import { UsersService } from '../users.service';

@WebSocketGateway({ namespace: 'users' })
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly usersLogger = new Logger('UsersGateway');
  constructor(
    private authService: AuthService,
    private cache: Cache,
    private usersService: UsersService,
  ) {}

  async onModuleInit() {
    await this.cache.reset();
  }

  async handleDisconnect(client: any) {
    await this.setActiveStatus(client, false);
  }

  async handleConnection(client: any) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      this.handleDisconnect(client);
      return;
    }
    client.data.user = user;
    await this.setActiveStatus(client, true);
  }

  private async getFriends(userId: string) {
    const user = await this.usersService.getUserById(userId);
    return user.friendships;
  }

  private async emitStatusToFriends(activeUser: ActiveUser) {
    const friends = await this.getFriends(activeUser.id);
    for (const f of friends) {
      const user = await this.cache.get(f.id);

      if (!user) {
        continue;
      }
      const friend = user as ActiveUser;
      this.server.to(friend.socketId).emit('friendActive', {
        id: activeUser.id,
        status: activeUser.status,
      });

      if (activeUser.status) {
        this.server.to(activeUser.socketId).emit('friendActive', {
          id: friend.id,
          status: friend.status,
        });
      }
    }
  }

  private async setActiveStatus(client: Socket, status: boolean) {
    const user = client.data?.user;

    if (!user) {
      return;
    }
    const activeUser: ActiveUser = {
      id: user.id,
      socketId: client.id,
      status,
    };
    await this.cache.set(user.id, activeUser);
    await this.emitStatusToFriends(activeUser);
  }

  @SubscribeMessage('updateActiveStatus')
  async updateActiveStatus(client: Socket, status: boolean) {
    if (!client.data?.user) {
      return;
    }
    await this.setActiveStatus(client, status);
  }
}