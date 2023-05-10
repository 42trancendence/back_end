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
import { EnterChatRoomDto } from '../dto/enter-chat-room.dto';

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
  //
  // TODO: userId dto 적용 필요
  //

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
      return { status: false, message: error.message };
    }
  }

  @SubscribeMessage('setAdmin')
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

      this.ChatRoomLogger.debug(
        `[setAdminUser] ${user.name} setted admin from by ${client.data.user.name}`,
      );

      await this.chatRoomService.setAdminUser(chatRoom, user);

      this.server
        .to(client.data.chatRoomId)
        .emit(
          'getChatRoomUsers',
          await this.chatRoomService.getChatRoomUsers(chatRoom),
        );
    } catch (error) {
      this.ChatRoomLogger.error(`[setAdminUser] ${error.message}`);
      return { status: false, message: error.message };
    }
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

      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new WsException('User not found');
      }

      this.ChatRoomLogger.debug(
        `[toggleBlockUser] ${user.name} blocked from by ${client.data.user.name}`,
      );

      const directMessage = await this.chatRoomService.createDirectMessage(
        client.data.user,
        user,
      );

      await this.chatRoomService.toggleBlockUser(
        directMessage,
        client.data.user,
      );
      client.emit(
        'getDirectMessageUsers',
        await this.chatRoomService.getDirectMessageUsers(
          directMessage,
          client.data.user,
        ),
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

      this.ChatRoomLogger.debug(
        `[toggleBanUser] ${user.name} banned from ${chatRoom.name} by ${client.data.user.name}`,
      );

      if (await this.chatRoomService.toggleBanUser(chatRoom, user)) {
        await this.emitKickUserInChatRoom(
          client.data.chatRoomId,
          user.id,
          chatRoom,
        );
      } else {
        client
          .to(client.data.chatRoomId)
          .emit(
            'getChatRoomUsers',
            await this.chatRoomService.getChatRoomUsers(chatRoom),
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

      this.ChatRoomLogger.debug(
        `[kickUser] ${user.name} kicked from ${chatRoom.name} by ${client.data.user.name}`,
      );

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

      this.ChatRoomLogger.debug(
        `[setMuteUser] ${user.name} muted from ${chatRoom.name} by ${client.data.user.name}`,
      );

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
      this.ChatRoomLogger.debug(`[createChatRoom]`);
      await this.chatRoomValidation.validateCreateChatRoom(
        client,
        createChatRoomDto.name,
      );

      await this.chatRoomService.createChatRoom(
        createChatRoomDto,
        client.data.user,
      );
      return { status: true, message: 'ok' };
    } catch (error) {
      this.ChatRoomLogger.error(
        `[createChatRoom] ${error.message} ${client.data.where}`,
      );
      return { status: false, message: error.message };
    }
  }

  @SubscribeMessage('enterChatRoom')
  async enterChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() enterChatRoomDto: EnterChatRoomDto,
  ) {
    try {
      this.ChatRoomLogger.debug(
        `[enterChatRoom] roomName: ${enterChatRoomDto.roomName}, password: ${enterChatRoomDto.password}`,
      );
      await this.chatRoomValidation.validateUserInLobby(client);

      await this.clientJoinChatRoom(
        client,
        enterChatRoomDto.roomName,
        enterChatRoomDto.password,
      );
    } catch (error) {
      this.ChatRoomLogger.error(`[enterChatRoom] ${error.message}`);
      return { status: false, message: error.message };
    }
  }

  // NOTE: chat 페이지 접속시
  @SubscribeMessage('enterChatLobby')
  async enterChatLobby(@ConnectedSocket() client: Socket) {
    try {
      this.ChatRoomLogger.debug(`[enterChatLobby]`);
      if (!client.data?.user) {
        throw new WsException('User not found');
      }
      // NOTE: 현재 유저가 속해있던 곳에서 퇴장
      await this.leaveCurrentPosition(client);
      await this.clinetJoinLobby(client);
      return { status: true, message: 'ok' };
    } catch (error) {
      this.ChatRoomLogger.error(`[enterChatLobby] ${error.message}`);
      return { status: false, message: error.message };
    }
  }

  // NOTE: 아예 chat 페이지에서 나감 -> overview 페이지로 이동
  @SubscribeMessage('leaveChatPage')
  async leaveChatPage(@ConnectedSocket() client: Socket) {
    try {
      this.ChatRoomLogger.debug(`[leaveChatPage]`);
      if (!client.data?.user) {
        throw new WsException('User not found');
      }
      await this.leaveCurrentPosition(client);
      return { status: true, message: 'ok' };
    } catch (error) {
      this.ChatRoomLogger.error(`[leaveChatPage] ${error.message}`);
      return { status: false, message: error.message };
    }
  }

  @SubscribeMessage('enterDirectMessage')
  async enterDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody('directMessageId') directMessageId: string,
  ) {
    try {
      if (!client.data?.user) {
        throw new WsException('유저를 찾을 수 없습니다.');
      }

      this.ChatRoomLogger.debug(
        `[enterDirectMessage] ${client.data.user.name} enter direct message`,
      );
      const directMessage = await this.chatRoomService.getDirectMessageById(
        `DM` + directMessageId,
      );

      if (!directMessage) {
        throw new WsException('존재하지 않는 DM방입니다.');
      }

      await this.clientJoinDirectMessage(client, directMessage);
      return { status: true, message: 'ok' };
    } catch (error) {
      this.ChatRoomLogger.error(`[enterDirectMessage] ${error.message}`);
      return { status: false, message: error.message };
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

      this.ChatRoomLogger.debug(
        `[sendDirectMessage] ${client.data.user.name} send direct message`,
      );

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
      return { error: error.message };
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

      this.ChatRoomLogger.debug(
        `[createDirectMessage] ${client.data.user.name} create direct message`,
      );

      const receiver = await this.usersService.getUserById(receiverId);
      if (!receiver) {
        throw new WsException('User not found');
      }

      const directMessage = await this.chatRoomService.createDirectMessage(
        client.data.user,
        receiver,
      );

      return { status: true, directMessageId: directMessage.id };
      // await this.clientJoinDirectMessage(client, directMessage);
    } catch (error) {
      this.ChatRoomLogger.error(`[createDirectMessage] ${error.message}`);
      return { status: false, error: error.message };
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
  }

  async handleDisconnect(client: Socket) {
    //TODO: user가 속해있던 chat-room에서 나가기? 리프레쉬는 어떻게 처리?
    this.ChatRoomLogger.log(`chat-room disconnected`);
    if (!client.data?.user) {
      return;
    }
    if (client.data.where === UserWhere.CHATROOM) {
      const chatRoom = await this.chatRoomService.getChatRoomById(
        client.data.chatRoomId,
      );
      if (!chatRoom) {
        return;
      }
      const isUserIn = await this.chatRoomService.isUserInChatRoom(client);
      if (!isUserIn) {
        await this.chatRoomService.deleteChatRoomUser(
          chatRoom,
          client.data.user,
        );
        this.server
          .to(client.data.chatRoomId)
          .emit(
            'getChatRoomUsers',
            await this.chatRoomService.getChatRoomUsers(chatRoom),
          );
        this.server
          .to('lobby')
          .emit(
            'getChatRoomList',
            await this.chatRoomService.getAllChatRooms(),
          );
      }
    }
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
    client.emit(
      'getChatRoomMessages',
      await this.chatRoomService.getDmMessages(directMessage),
    );
    // const isBlocked =
    //   directMessage.user1.id === client.data.user.id
    //     ? directMessage.isBlockedByUser1
    //     : directMessage.isBlockedByUser2;
    // const users = {
    //   user1: {
    //     id: directMessage.user1.id,
    //     name: directMessage.user1.name,
    //   },
    //   user2: {
    //     id: directMessage.user2.id,
    //     name: directMessage.user2.name,
    //   },
    //   isBlocked,
    // };
    client.emit(
      'getDirectMessageUsers',
      await this.chatRoomService.getDirectMessageUsers(
        directMessage,
        client.data.user,
      ),
    );
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
    client.emit(
      'getChatRoomMessages',
      await this.chatRoomService.getChatRoomMessages(chatRoom),
    );

    const isUserIn = await this.chatRoomService.isUserInChatRoom(client);
    if (isUserIn) {
      client.emit(
        'getChatRoomUsers',
        await this.chatRoomService.getChatRoomUsers(chatRoom),
      );
      client.join(client.data.chatRoomId);
    } else {
      client.join(client.data.chatRoomId);
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
      if (socket.data?.user?.id === receiver.id) {
        socket.emit('newDirectMessage', {
          id: message.directMessage.id,
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
    client.data.chatRoomId = '';
  }

  async leaveDirectMessage(client: Socket) {
    await this.chatRoomValidation.validateUserInDirectMessage(client);

    this.ChatRoomLogger.debug(
      `[leaveDirectMessage] ${client.data.user.name} leave direct message`,
    );

    client.leave(client.data.chatRoomId);
  }

  async leaveChatRoom(client: Socket) {
    const chatRoom = await this.chatRoomValidation.validateUserInChatRoom(
      client,
    );
    this.ChatRoomLogger.debug(
      `[leaveChatRoom] ${client.data.user.name} leave chat room`,
    );

    // NOTE: 만약 해당 방에 같은 아이디로 로그인된 유저가 있다면
    // chatRoomUser를 삭제하면 안됨
    client.leave(client.data.chatRoomId);
    const isUserIn = await this.chatRoomService.isUserInChatRoom(client);
    if (!isUserIn) {
      await this.chatRoomService.deleteChatRoomUser(chatRoom, client.data.user);
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
  }
}
