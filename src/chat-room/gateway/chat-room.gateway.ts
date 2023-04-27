import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Namespace, RemoteSocket, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { ChatRoomService } from '../chat-room.service';
import { CreateChatRoomDto } from '../dto/create-chat-room.dto';
import { UpdateChatRoomDto } from '../dto/update-chat-room.dto';
import { ChatRoomValidationPipe } from '../pipes/chat-room-validation.pipe';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { ChatRoomValidation } from '../chat-room.validation';
import { ChatRoomType } from '../enum/chat-room-type.enum';
import { DirectMessageEntity } from '../entities/directMessage.entity';
import { ChatRoomRole } from '../enum/chat-room-role.enum';
import { WsExceptionFilter } from 'src/util/filter/ws-exception.filter';
import { WsAuthGuard } from 'src/auth/guard/ws-auth.guard';

@UseFilters(new WsExceptionFilter())
@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: 'chat-room',
  cors: { origin: 'http://localhost:4000', credentials: true },
})
export class ChatRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Namespace;
  private readonly ChatRoomLogger = new Logger('ChatRoomLogger');

  constructor(
    private chatRoomValidation: ChatRoomValidation,
    private chatRoomService: ChatRoomService,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ) {
    try {
      const chatRoom = await this.chatRoomValidation.validateUserInChatRoom(
        client,
      );

      const message = await this.chatRoomService.saveMessage(
        client.data.user,
        chatRoom,
        payload,
      );

      client.broadcast.to(client.data.chatRoomId).emit('getMessage', message);
    } catch (error) {
      this.ChatRoomLogger.error(`[sendMessage] ${error.message}`);
    }
  }

  @SubscribeMessage('sendDirectMessage')
  async handleDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ) {
    try {
      const directMessage =
        await this.chatRoomValidation.validateUserInDirectMessage(client);

      const message = await this.chatRoomService.saveDirectMessage(
        client.data.user,
        directMessage,
        payload,
      );

      if (!message) {
        return;
      }

      client.broadcast.to(client.data.chatRoomId).emit('getMessage', message);
      // TODO: add notification to sender
    } catch (error) {
      this.ChatRoomLogger.error(`[sendDirectMessage] ${error.message}`);
    }
  }

  @SubscribeMessage('setAdminUser')
  async setAdminUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const chatRoom = await this.chatRoomValidation.validateChatRoomOwnerShip(
        client,
      );

      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new WsException('User not found');
      }

      await this.chatRoomService.setAdminUser(chatRoom, user);
    } catch (error) {}
  }

  @SubscribeMessage('toggleBlockUser')
  async toggleBlockUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      if (!client.data?.user) {
        throw new WsException('User not found');
      }

      const blockUser = await this.usersService.getUserById(userId);
      if (!blockUser) {
        throw new WsException('User not found');
      }

      const directMessage = await this.chatRoomService.createDirectMessage(
        client.data.user,
        blockUser,
      );

      await this.chatRoomService.toggleBlockUser(
        directMessage,
        client.data.user,
      );
    } catch (error) {
      this.ChatRoomLogger.error(`[toggleBlockUser] ${error.message}`);
    }
  }

  @SubscribeMessage('toggleBanUser')
  async toggleBanUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const chatRoom = await this.chatRoomValidation.validateChatRoomAdmin(
        client,
      );

      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new WsException('User not found');
      }

      if (await this.chatRoomService.toggleBanUser(chatRoom, user)) {
        await this.emitEventToChatRoomUser(
          client.data.chatRoomId,
          'kickUser',
          null,
          user.id,
          false,
        );
      }

      this.server
        .to(client.data.chatRoomId)
        .emit(
          'getChatRoomUsers',
          await this.chatRoomService.getChatRoomUsers(chatRoom),
        );
    } catch (error) {
      this.ChatRoomLogger.error(`[toggleBanUser] ${error.message}`);
    }
  }

  @SubscribeMessage('kickUser')
  async kickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const chatRoom = await this.chatRoomValidation.validateChatRoomAdmin(
        client,
      );

      //TODO: delete chatRoomUser
      await this.emitEventToChatRoomUser(
        client.data.chatRoomId,
        'kickUser',
        null,
        userId,
        false,
      );

      this.server
        .to(client.data.chatRoomId)
        .emit(
          'getChatRoomUsers',
          await this.chatRoomService.getChatRoomUsers(chatRoom),
        );
    } catch (error) {
      this.ChatRoomLogger.error(`[kickUser] ${error.message}`);
    }
  }

  @SubscribeMessage('setMuteUser')
  async muteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const chatRoom = await this.chatRoomValidation.validateChatRoomAdmin(
        client,
      );

      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new WsException('User not found');
      }

      await this.chatRoomService.setMuteUser(chatRoom, user);
    } catch (error) {
      this.ChatRoomLogger.error(`[toggleMuteUser] ${error.message}`);
    }
  }

  @SubscribeMessage('updateChatRoom')
  async updateChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(ChatRoomValidationPipe) updateChatRoomDto: UpdateChatRoomDto,
  ) {
    try {
      const chatRoom = await this.chatRoomValidation.validateChatRoomOwnerShip(
        client,
      );

      await this.chatRoomService.updateChatRoom(chatRoom, updateChatRoomDto);

      this.server
        .to('lobby')
        .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
    } catch (error) {
      this.ChatRoomLogger.error(`[updateChatRoom] ${error.message}`);
    }
  }

  @SubscribeMessage('createDirectMessage')
  async createDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() receiverId: string,
  ) {
    try {
      await this.chatRoomValidation.validateUserInLobby(client);

      const receiver = await this.usersService.getUserById(receiverId);
      if (!receiver) {
        throw new WsException('User not found');
      }

      const directMessage = await this.chatRoomService.createDirectMessage(
        client.data.user,
        receiver,
      );

      await this.clientJoinDirectMessage(client, directMessage);

      const sockets = await this.server.fetchSockets();
      for (const socket of sockets) {
        if (socket.data.user.id === receiverId) {
          this.server
            .to(socket.id)
            .emit(
              'showDirectMessageList',
              await this.chatRoomService.getDirectMessages(receiver),
            );
        }
      }
    } catch (error) {
      this.ChatRoomLogger.error(`[createDirectMessage] ${error.message}`);
    }
  }

  @SubscribeMessage('createChatRoom')
  async createChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(ChatRoomValidationPipe) createChatRoomDto: CreateChatRoomDto,
  ) {
    try {
      await this.chatRoomValidation.validateCreateChatRoom(
        client,
        createChatRoomDto.name,
      );

      await this.chatRoomService.createChatRoom(
        createChatRoomDto,
        client.data.user,
      );

      await this.clientJoinChatRoom(
        client,
        createChatRoomDto.name,
        createChatRoomDto.password,
      );

      // this.server
      //   .to('lobby')
      //   .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
    } catch (error) {
      this.ChatRoomLogger.error(`[createChatRoom] ${error.message}`);
    }
  }

  @SubscribeMessage('enterDirectMessage')
  async enterDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody('directMessageId') directMessageId: string,
  ) {
    try {
      await this.chatRoomValidation.validateUserInLobby(client);

      const directMessage = await this.chatRoomService.getDirectMessageById(
        directMessageId,
      );

      if (!directMessage) {
        throw new WsException('Direct message not found');
      }

      await this.clientJoinDirectMessage(client, directMessage);
    } catch (error) {
      this.ChatRoomLogger.error(`[enterDirectMessage] ${error.message}`);
    }
  }

  @SubscribeMessage('enterChatRoom')
  async enterChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
    @MessageBody('password') password: string,
  ) {
    try {
      this.ChatRoomLogger.debug(
        `[enterChatRoom] roomName: ${roomName}, password: ${password}`,
      );
      await this.chatRoomValidation.validateUserInLobby(client);

      await this.clientJoinChatRoom(client, roomName, password);
    } catch (error) {
      this.ChatRoomLogger.error(`[enterChatRoom] ${error.message}`);
    }
  }

  @SubscribeMessage('leaveChatRoom')
  async leaveChatRoom(@ConnectedSocket() client: Socket) {
    try {
      await this.chatRoomValidation.validateUserInChatRoom(client);

      // TODO: 만약 나가는 유저가 방장이라면 방장을 위임해야함
      await this.clinetJoinLobby(client);
    } catch (error) {
      this.ChatRoomLogger.error(`[leaveChatRoom] ${error.message}`);
    }
  }

  async handleConnection(client: Socket) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      this.ChatRoomLogger.debug('[handleConnection] user not found');
      client.disconnect();
      return;
    }
    this.ChatRoomLogger.debug(`[handleConnection] ${user?.name} connected`);
    client.data.user = user;
    client.data.chatRoomId = 'lobby';
    client.leave(client.id);
    await this.clinetJoinLobby(client);
  }

  async handleDisconnect() {
    //TODO: user가 속해있던 chat-room에서 user를 퇴장 시켜야함
    this.ChatRoomLogger.log(`chat-room disconnected`);
  }

  async clientJoinDirectMessage(
    client: Socket,
    directMessage: DirectMessageEntity,
  ) {
    if (!directMessage) {
      throw new WsException('Direct Message not found');
    }

    client.leave('lobby');
    client.data.chatRoomId = 'DM' + directMessage.id;
    client.join(client.data.chatRoomId);
    client.emit('getChatRoomMessages', directMessage.messages);
  }

  async clientJoinChatRoom(
    client: Socket,
    chatRoomName: string,
    password: string,
  ) {
    const chatRoom = await this.chatRoomService.getChatRoomByName(chatRoomName);

    if (!chatRoom) {
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    if (
      chatRoom.type === ChatRoomType.PROTECTED &&
      bcrypt.compareSync(password, chatRoom.password) === false
    ) {
      throw new WsException('비밀번호가 틀렸습니다.');
    }

    await this.chatRoomService.createChatRoomUser(
      chatRoom,
      client.data.user,
      ChatRoomRole.NORMAL,
    );

    client.leave('lobby');
    client.data.chatRoomId = chatRoom.id.toString();
    client.join(client.data.chatRoomId);

    this.server
      .to(client.data.chatRoomId)
      .emit(
        'getChatRoomUsers',
        await this.chatRoomService.getChatRoomUsers(chatRoom),
      );
    //TODO: 가져올 메시지 개수 제한, message repository에서 가져오는 방식으로 변경
    client.emit('getChatRoomMessages', chatRoom.messages);
    this.server
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
  }

  async clinetJoinLobby(client: Socket | RemoteSocket<DefaultEventsMap, any>) {
    if (client.data?.chatRoomId !== 'lobby') {
      client.leave(client.data.chatRoomId);
    }

    client.data.chatRoomId = 'lobby';
    client.join('lobby');
    client.emit(
      'showChatRoomList',
      await this.chatRoomService.getAllChatRooms(),
    );

    client.emit(
      'showDirectMessageList',
      await this.chatRoomService.getDirectMessages(client.data.user),
    );
  }

  // async getChatRoomUsers(chatRoomId: string) {
  //   const allSockets = await this.server.in(chatRoomId).fetchSockets();
  //   const chatRoomUsers = new Set<string>();
  //   for (const socket of allSockets) {
  //     socket.data?.user && chatRoomUsers.add(socket.data.user.name);
  //   }
  //
  //   const serializedSet = [...chatRoomUsers.keys()];
  //   this.ChatRoomLogger.debug(`[getChatRoomUsers] ${serializedSet}`);
  //   return serializedSet;
  // }

  async emitEventToChatRoomUser(
    chatRoomId: string,
    event: string,
    data: any,
    userId: string,
    all: boolean,
  ) {
    const sockets = await this.server.in(chatRoomId).fetchSockets();
    for (const socket of sockets) {
      if (all || socket.data?.user?.id === userId) {
        socket.emit(event, data);
        if (event === 'kickUser') {
          await this.clinetJoinLobby(socket);
        }
      }
    }
  }
}
