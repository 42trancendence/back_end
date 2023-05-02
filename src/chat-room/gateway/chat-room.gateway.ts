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
import { ChatRoomEntity } from '../entities/chatRoom.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { MessageEntity } from '../entities/message.entity';
import { UserWhere } from '../enum/user-where.enum';

@UseFilters(new WsExceptionFilter())
@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: '/chat-room',
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

      this.server
        .to(client.data.chatRoomId)
        .emit(
          'getChatRoomUsers',
          await this.chatRoomService.getChatRoomUsers(chatRoom),
        );
    } catch (error) {
      this.ChatRoomLogger.error(`[setAdminUser] ${error.message}`);
    }
  }

  @SubscribeMessage('toggleBlockUser')
  async toggleBlockUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      // NOTE: direct message room 안에서만 동작?
      if (!client.data?.user) {
        throw new WsException('User not found');
      }

      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new WsException('User not found');
      }

      const directMessage = await this.chatRoomService.createDirectMessage(
        client.data.user,
        user,
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
        await this.emitKickUserInChatRoom(
          client.data.chatRoomId,
          user.id,
          chatRoom,
        );
      }
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

      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new WsException('User not found');
      }

      await this.chatRoomService.setKickUser(chatRoom, user);
      await this.emitKickUserInChatRoom(
        client.data.chatRoomId,
        userId,
        chatRoom,
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
    } catch (error) {
      this.ChatRoomLogger.error(`[createChatRoom] ${error.message}`);
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

  // NOTE: chat 페이지 접속시
  @SubscribeMessage('enterChatLobby')
  async enterChatLobby(@ConnectedSocket() client: Socket) {
    try {
      if (!client.data?.user) {
        throw new WsException('User not found');
      }
      // NOTE: 현재 유저가 속해있던 곳에서 퇴장
      await this.leaveCurrentPosition(client);
      await this.clinetJoinLobby(client);
    } catch (error) {
      this.ChatRoomLogger.error(`[enterChatLobby] ${error.message}`);
    }
  }

  // NOTE: 아예 chat 페이지에서 나감 -> overview 페이지로 이동
  @SubscribeMessage('leaveChatPage')
  async leaveChatPage(@ConnectedSocket() client: Socket) {
    try {
      if (!client.data?.user) {
        throw new WsException('User not found');
      }
      await this.leaveCurrentPosition(client);
    } catch (error) {
      this.ChatRoomLogger.error(`[leaveChatPage] ${error.message}`);
    }
  }

  @SubscribeMessage('enterDirectMessage')
  async enterDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody('directMessageId') directMessageId: string,
  ) {
    try {
      if (!client.data?.user) {
        throw new WsException('User not found');
      }

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

  async leaveDirectMessage(client: Socket) {
    await this.chatRoomValidation.validateUserInDirectMessage(client);

    this.ChatRoomLogger.debug(
      `[leaveDirectMessage] ${client.data.user.name} leave direct message`,
    );

    client.leave(client.data.chatRoomId);
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

      const receiver =
        directMessage.user1.id === client.data.user.id
          ? directMessage.user2
          : directMessage.user1;

      client.broadcast.to(client.data.chatRoomId).emit('getMessage', message);
      await this.emitDirectMessageList(receiver);

      const sockets = await this.server
        .in(client.data.chatRoomId)
        .fetchSockets();
      for (const socket of sockets) {
        if (socket.data?.user?.id === receiver.id) {
          return;
        }
      }
      // NOTE: 이미 같은 채팅방에 접속되어 있으면 dm 알림을 보내지 않는다.
      await this.emitNotification(receiver, message);
    } catch (error) {
      this.ChatRoomLogger.error(`[sendDirectMessage] ${error.message}`);
    }
  }

  @SubscribeMessage('createDirectMessage')
  async createDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody('receiverId') receiverId: string,
  ) {
    try {
      if (!client.data?.user) {
        throw new WsException('User not found');
      }

      const receiver = await this.usersService.getUserById(receiverId);
      if (!receiver) {
        throw new WsException('User not found');
      }

      const directMessage = await this.chatRoomService.createDirectMessage(
        client.data.user,
        receiver,
      );

      await this.clientJoinDirectMessage(client, directMessage);
    } catch (error) {
      this.ChatRoomLogger.error(`[createDirectMessage] ${error.message}`);
    }
  }

  async handleConnection(client: Socket) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      this.ChatRoomLogger.error('[handleConnection] user not found');
      client.disconnect();
      return;
    }
    this.ChatRoomLogger.debug(`[handleConnection] ${user?.name} connected`);
    client.data.user = user;
    client.data.where = UserWhere.NONE;
    client.leave(client.id);
    // TODO: after delete it
    await this.clinetJoinLobby(client);
  }

  async handleDisconnect(client: Socket) {
    //TODO: user가 속해있던 chat-room에서 나가기? 리프레쉬는 어떻게 처리?
    this.ChatRoomLogger.log(`chat-room disconnected`);
  }

  async clientJoinDirectMessage(
    client: Socket,
    directMessage: DirectMessageEntity,
  ) {
    if (!directMessage) {
      throw new WsException('Direct Message not found');
    }
    await this.leaveCurrentPosition(client);

    client.data.chatRoomId = 'DM' + directMessage.id;
    client.data.where = UserWhere.DM;
    client.join(client.data.chatRoomId);
    //TODO: 가져올 메시지 개수 제한, message repository에서 가져오는 방식으로 변경
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
    client.data.where = UserWhere.CHATROOM;
    client.join(client.data.chatRoomId);
    //TODO: 가져올 메시지 개수 제한, message repository에서 가져오는 방식으로 변경
    client.emit('getChatRoomMessages', chatRoom.messages);

    const isUserIn = await this.chatRoomService.isUserInChatRoom(client);
    if (isUserIn) {
      client.emit(
        'getChatRoomUsers',
        await this.chatRoomService.getChatRoomUsers(chatRoom),
      );
      return;
    }
    this.server
      .to(client.data.chatRoomId)
      .emit(
        'getChatRoomUsers',
        await this.chatRoomService.getChatRoomUsers(chatRoom),
      );
    this.server
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
  }

  async clinetJoinLobby(client: Socket | RemoteSocket<DefaultEventsMap, any>) {
    client.data.chatRoomId = 'lobby';
    client.data.where = UserWhere.LOBBY;
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

  async emitKickUserInChatRoom(
    chatRoomId: string,
    userId: string,
    chatRoom: ChatRoomEntity,
  ) {
    const sockets = await this.server.in(chatRoomId).fetchSockets();
    for (const socket of sockets) {
      if (socket.data?.user?.id === userId) {
        socket.emit('kickUser');
        socket.leave(chatRoomId);
        await this.clinetJoinLobby(socket);
      }
    }
    this.server
      .to(chatRoomId)
      .emit(
        'getChatRoomUsers',
        await this.chatRoomService.getChatRoomUsers(chatRoom),
      );
  }

  async emitNotification(receiver: UserEntity, message: MessageEntity) {
    const sockets = await this.server.fetchSockets();
    for (const socket of sockets) {
      if (socket.data?.userId === receiver.id) {
        socket.emit('newDirectMessage', {
          name: message.user.name,
          message: message.message,
        });
      }
    }
  }

  async emitDirectMessageList(receiver: UserEntity) {
    const sockets = await this.server.fetchSockets();
    for (const socket of sockets) {
      if (
        socket.data.user.id === receiver.id &&
        socket.data?.where === UserWhere.LOBBY
      ) {
        socket.emit(
          'showDirectMessageList',
          await this.chatRoomService.getDirectMessages(receiver),
        );
      }
    }
  }

  async leaveCurrentPosition(client: Socket) {
    if (client.data.where === UserWhere.LOBBY) {
      client.leave('lobby');
    } else if (client.data.where === UserWhere.CHATROOM) {
      await this.leaveChatRoom(client);
    } else if (client.data.where === UserWhere.DM) {
      await this.leaveDirectMessage(client);
    }
    client.data.where = UserWhere.NONE;
    client.data.chatRoomId = null;
  }

  async leaveChatRoom(client: Socket) {
    const chatRoom = await this.chatRoomValidation.validateUserInChatRoom(
      client,
    );
    // NOTE: 만약 해당 방에 같은 아이디로 로그인된 유저가 있다면
    // chatRoomUser를 삭제하면 안됨
    client.leave(client.data.chatRoomId);
    const isUserIn = await this.chatRoomService.isUserInChatRoom(client);
    if (!isUserIn) {
      await this.chatRoomService.deleteChatRoomUser(chatRoom, client.data.user);
      this.server
        .to('lobby')
        .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
    }
  }
}
