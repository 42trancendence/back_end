import {
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
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
import { UsersService } from 'src/users/users.service';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { ChatRoomValidation } from '../chat-room.validation';
import { DirectMessageEntity } from '../entities/directMessage.entity';
import { ChatRoomRole } from '../enum/chat-room-role.enum';
import { WsExceptionFilter } from 'src/util/filter/ws-exception.filter';
import { WsAuthGuard } from 'src/auth/guard/ws-auth.guard';
import { ChatRoomEntity } from '../entities/chatRoom.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { MessageEntity } from '../entities/message.entity';
import { UserWhere } from '../enum/user-where.enum';
import { EnterChatRoomDto } from '../dto/enter-chat-room.dto';
import { DirectMessageService } from '../direct-message.service';

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
  private readonly ChatRoomLogger = new Logger('ChatRoomGateway');

  constructor(
    private chatRoomValidation: ChatRoomValidation,
    private chatRoomService: ChatRoomService,
    private directMessageService: DirectMessageService,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}
  //
  // TODO: userId dto 적용 필요
  //

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 채팅방에 없음
  // 3. 채팅방이 없음
  // 4. chatRoomUsers가 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동
  // 5. message가 비어있거나 너무 큼
  // 6. mute 당함
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ) {
    try {
      const { chatRoom, chatRoomUser } =
        await this.chatRoomValidation.validateUserInChatRoom(client);

      const message = await this.chatRoomService.saveMessage(
        client.data.user,
        chatRoom,
        chatRoomUser,
        payload,
      );

      client.broadcast.to(client.data.chatRoomId).emit('getMessage', message);
    } catch (error) {
      this.ChatRoomLogger.error(`[sendMessage] ${error.message}`);
      return { status: false, message: error.message };
    }
  }

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 채팅방에 없음
  // 3. 채팅방이 없음
  // 4. chatRoomUsers가 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동
  // 5. 권한 없음
  // 6. 상대방을 찾을수 없음, 채팅방에 없음, 일반유저가 아님
  @SubscribeMessage('setAdmin')
  async setAdminUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const { chatRoom } =
        await this.chatRoomValidation.validateUserInChatRoomRole(
          client,
          ChatRoomRole.OWNER,
        );
      const chatRoomUser = await this.chatRoomValidation.validateUserIsNormal(
        userId,
        chatRoom,
      );

      this.ChatRoomLogger.debug(
        `[setAdminUser] ${chatRoomUser.user.name} setted admin by ${client.data.user.name}`,
      );

      await this.chatRoomService.setUserRole(chatRoomUser, ChatRoomRole.ADMIN);

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

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 채팅방에 없음
  // 3. 채팅방이 없음
  // 4. chatRoomUsers가 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동
  // 5. 권한 없음
  // 6. 상대방을 찾을수 없음, 채팅방에 없음, 일반유저가 아님
  @SubscribeMessage('toggleBanUser')
  async toggleBanUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const { chatRoom } =
        await this.chatRoomValidation.validateUserInChatRoomRole(
          client,
          ChatRoomRole.ADMIN,
        );

      const chatRoomUser = await this.chatRoomValidation.validateUserIsNormal(
        userId,
        chatRoom,
      );
      this.ChatRoomLogger.debug(
        `[toggleBanUser] ${chatRoomUser.user.name} banned from ${chatRoom.name} by ${client.data.user.name}`,
      );

      await this.chatRoomService.toggleBanUser(chatRoomUser);
      await this.emitKickUserInChatRoom(
        client.data.chatRoomId,
        userId,
        chatRoom,
      );
    } catch (error) {
      this.ChatRoomLogger.error(`[toggleBanUser] ${error.message}`);
    }
  }

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 채팅방에 없음
  // 3. 채팅방이 없음
  // 4. chatRoomUsers가 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동
  // 5. 권한 없음
  // 6. 상대방을 찾을수 없음, 채팅방에 없음, 일반유저가 아님
  @SubscribeMessage('kickUser')
  async kickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const { chatRoom } =
        await this.chatRoomValidation.validateUserInChatRoomRole(
          client,
          ChatRoomRole.ADMIN,
        );

      const chatRoomUser = await this.chatRoomValidation.validateUserIsNormal(
        userId,
        chatRoom,
      );

      this.ChatRoomLogger.debug(
        `[kickUser] ${chatRoomUser.user.name} kicked from ${chatRoom.name} by ${client.data.user.name}`,
      );

      await this.chatRoomService.setKickUser(chatRoomUser);
      await this.emitKickUserInChatRoom(
        client.data.chatRoomId,
        userId,
        chatRoom,
      );
    } catch (error) {
      this.ChatRoomLogger.error(`[kickUser] ${error.message}`);
    }
  }

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 채팅방에 없음
  // 3. 채팅방이 없음
  // 4. chatRoomUsers가 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동
  // 5. 권한 없음
  // 6. 상대방을 찾을수 없음, 채팅방에 없음, 일반유저가 아님
  @SubscribeMessage('setMuteUser')
  async muteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const { chatRoom } =
        await this.chatRoomValidation.validateUserInChatRoomRole(
          client,
          ChatRoomRole.ADMIN,
        );
      const chatRoomUser = await this.chatRoomValidation.validateUserIsNormal(
        userId,
        chatRoom,
      );

      this.ChatRoomLogger.debug(
        `[setMuteUser] ${chatRoomUser.user.name} muted from ${chatRoom.name} by ${client.data.user.name}`,
      );

      await this.chatRoomService.setMuteUser(chatRoomUser, true);
    } catch (error) {
      this.ChatRoomLogger.error(`[toggleMuteUser] ${error.message}`);
    }
  }

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 채팅방에 없음
  // 3. 채팅방이 없음
  // 4. chatRoomUsers가 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동
  // 5. 권한 없음
  @SubscribeMessage('updateChatRoom')
  async updateChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(ChatRoomValidationPipe) updateChatRoomDto: UpdateChatRoomDto,
  ) {
    try {
      const { chatRoom } =
        await this.chatRoomValidation.validateUserInChatRoomRole(
          client,
          ChatRoomRole.OWNER,
        );

      await this.chatRoomService.updateChatRoom(chatRoom, updateChatRoomDto);

      this.server
        .to('lobby')
        .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
    } catch (error) {
      this.ChatRoomLogger.error(`[updateChatRoom] ${error.message}`);
    }
  }

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 로비에 없음
  // 3. 채팅방 이름이 비어있음
  // 4. 채팅방 이름이 중복됨
  // -------- 치명적 에러 ---- -> chat lobby로 이동
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

      const chatRoom = await this.chatRoomService.createChatRoom(
        createChatRoomDto,
      );
      await this.chatRoomService.createChatRoomUser(
        chatRoom,
        client.data.user,
        ChatRoomRole.OWNER,
      );
      return { status: true, message: 'ok' };
    } catch (error) {
      this.ChatRoomLogger.error(
        `[createChatRoom] ${error.message} ${client.data.where}`,
      );
      return { status: false, message: error.message };
    }
  }

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 로비에 없음
  // 3. 채팅방이 존재하지 않음
  // 4. 채팅방 비밀번호가 틀림
  // 5. 채팅방에서 차단당함
  // -------- 치명적 에러 ---- -> chat lobby로 이동

  @UsePipes(ValidationPipe)
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
      const chatRoom = await this.chatRoomValidation.validateChatRoom(
        enterChatRoomDto,
      );
      await this.chatRoomService.createChatRoomUser(
        chatRoom,
        client.data.user,
        ChatRoomRole.NORMAL,
      );

      await this.clientJoinChatRoom(client, chatRoom);
    } catch (error) {
      this.ChatRoomLogger.error(`[enterChatRoom] ${error.message}`);
      return { status: false, message: error.message };
    }
  }

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 chatRoomId의 room에 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동

  @SubscribeMessage('enterChatLobby')
  async enterChatLobby(@ConnectedSocket() client: Socket) {
    try {
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

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 chatRoomId의 room에 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동

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

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 DM방에 없음
  // 3. DM방이 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동
  // 4. 상대방을 찾을수 없음

  @SubscribeMessage('toggleBlockUser')
  async toggleBlockUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const directMessage =
        await this.chatRoomValidation.validateUserInDirectMessage(client);

      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new WsException('User not found');
      }

      this.ChatRoomLogger.debug(
        `[toggleBlockUser] ${user.name} blocked by ${client.data.user.name}`,
      );

      await this.directMessageService.toggleBlockUser(
        directMessage,
        client.data.user,
      );

      client.emit(
        'getDirectMessageUsers',
        await this.directMessageService.getDirectMessageUsers(
          directMessage,
          client.data.user,
        ),
      );
    } catch (error) {
      this.ChatRoomLogger.error(`[toggleBlockUser] ${error.message}`);
    }
  }

  // NOTE: error handling
  // 1. 유저 없음
  // 2. dm ID가 유효하지 않음
  // 3. DM방이 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동
  @SubscribeMessage('enterDirectMessage')
  async enterDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody('directMessageId') directMessageId: string,
  ) {
    try {
      const directMessage =
        await this.chatRoomValidation.validateEnterDirectMessage(
          client,
          'DM' + directMessageId,
        );

      this.ChatRoomLogger.debug(
        `[enterDirectMessage] ${client.data.user.name} enter direct message`,
      );

      await this.clientJoinDirectMessage(client, directMessage);
      return { status: true, message: 'ok' };
    } catch (error) {
      this.ChatRoomLogger.error(`[enterDirectMessage] ${error.message}`);
      return { status: false, message: error.message };
    }
  }

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 유저가 dm에 없음
  // 3. DM방이 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동
  // 4. 메세지가 비어있거나 너무 큼
  // 5. 상대방으로 부터 차단당함
  @SubscribeMessage('sendDirectMessage')
  async handleDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ) {
    try {
      const { directMessage, receiver } =
        await this.chatRoomValidation.validateUserInDirectMessage(client);

      this.ChatRoomLogger.debug(
        `[sendDirectMessage] ${client.data.user.name} send direct message`,
      );

      const message = await this.directMessageService.saveMessage(
        client.data.user,
        directMessage,
        payload,
      );

      client.broadcast.to(client.data.chatRoomId).emit('getMessage', message);
      await this.emitDirectMessageList(receiver);
      await this.emitNotification(receiver, message);
    } catch (error) {
      this.ChatRoomLogger.error(`[sendDirectMessage] ${error.message}`);
      return { error: error.message };
    }
  }

  // NOTE: error handling
  // 1. 유저 없음
  // 2. 상대방이 없음
  // -------- 치명적 에러 ---- -> chat lobby로 이동
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

      const directMessage = await this.directMessageService.createDirectMessage(
        client.data.user,
        receiver,
      );

      return { status: true, directMessageId: directMessage.id };
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
    client.join('none');
  }

  async handleDisconnect(client: Socket) {
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
    await this.leaveCurrentPosition(client);

    client.leave('none');
    client.data.chatRoomId = 'DM' + directMessage.id;
    client.data.where = UserWhere.DM;
    client.join(client.data.chatRoomId);
    client.emit(
      'getChatRoomMessages',
      await this.directMessageService.getMessages(directMessage),
    );
    client.emit(
      'getDirectMessageUsers',
      await this.directMessageService.getDirectMessageUsers(
        directMessage,
        client.data.user,
      ),
    );
  }

  async clientJoinChatRoom(client: Socket, chatRoom: ChatRoomEntity) {
    client.leave('lobby');
    client.data.chatRoomId = chatRoom.id.toString();
    client.data.where = UserWhere.CHATROOM;
    client.emit(
      'getChatRoomMessages',
      await this.chatRoomService.getMessages(chatRoom),
    );

    const isUserIn = await this.chatRoomService.isUserInChatRoom(client);
    client.join(client.data.chatRoomId);
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
    this.ChatRoomLogger.debug(`[clientJoinLobby]`);
    client.leave('none');
    client.data.chatRoomId = 'lobby';
    client.data.where = UserWhere.LOBBY;
    client.join('lobby');
    client.emit(
      'showChatRoomList',
      await this.chatRoomService.getAllChatRooms(),
    );
    client.emit(
      'showDirectMessageList',
      await this.directMessageService.getDirectMessages(client.data.user),
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
    const lobbySockets = await this.server.to('lobby').fetchSockets();
    for (const socket of lobbySockets) {
      if (socket.data?.user?.id === receiver.id) {
        socket.emit('newDirectMessage', {
          id: message.directMessage.id,
          name: message.user.name,
          message: message.message,
        });
      }
    }
    const noneSockets = await this.server.to('none').fetchSockets();
    for (const socket of noneSockets) {
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
    const sockets = await this.server.to('lobby').fetchSockets();
    for (const socket of sockets) {
      if (socket.data.user.id === receiver.id) {
        socket.emit(
          'showDirectMessageList',
          await this.directMessageService.getDirectMessages(receiver),
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
    } else if (client.data.where === UserWhere.NONE) {
      client.leave('none');
    }
    client.data.where = UserWhere.NONE;
    client.data.chatRoomId = 'none';
    client.join('none');
  }

  async leaveDirectMessage(client: Socket) {
    await this.chatRoomValidation.validateUserInDirectMessage(client);

    this.ChatRoomLogger.debug(
      `[leaveDirectMessage] ${client.data.user.name} leave direct message`,
    );

    client.leave(client.data.chatRoomId);
  }

  async leaveChatRoom(client: Socket) {
    const { chatRoom } = await this.chatRoomValidation.validateUserInChatRoom(
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
