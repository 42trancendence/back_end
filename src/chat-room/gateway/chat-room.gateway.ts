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
import { ErrorStatus } from '../enum/error-status.enum';
import { ChatRoomUserEntity } from '../entities/chatRoomUser.entity';
import { getUserBySocket } from 'src/util/decorator/get-user-socket.decorator';

@UseFilters(new WsExceptionFilter())
@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: '/chat-room',
  cors: { origin: '*', credentials: true },
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
  // 1. client.data.user가 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // 3. 유저가 채팅방에 없음
  // 4. 채팅방이 없음
  // 5. chatRoomUsers가 없음
  // -------- ERROR ---- -> chat lobby로 이동
  // 6. message가 비어있거나 너무 큼
  // 7. mute 당함
  // -------- WARNING ---- -> 알림만 표시
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
    const { chatRoom, chatRoomUser } =
      await this.chatRoomValidation.validateUserInChatRoom(client);

    const message = await this.chatRoomService.saveMessage(
      client.data.user,
      chatRoom,
      chatRoomUser,
      payload,
    );

    client.broadcast.to(client.data.chatRoomId).emit('getMessage', message);
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // 3. 유저가 채팅방에 없음
  // 4. 채팅방이 없음
  // 5. chatRoomUsers가 없음
  // -------- ERROR ---- -> chat lobby로 이동
  // 5. 유저의 권한 없음
  // 6. 대상 유저 id가 없음
  // 7. 대상 유저를 찾을 수 없음
  // 8. 대상 유저가 채팅방에 없음
  // 9. 대상 유저가 일반 유저가 아님
  // -------- WARNING ---- -> 알림만 표시
  @SubscribeMessage('setAdmin')
  async setAdminUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
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
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 3. 유저가 채팅방에 없음
  // 4. 채팅방이 없음
  // 5. chatRoomUsers가 없음
  // -------- ERROR ---- -> chat lobby로 이동
  // 5. 유저의 권한 없음
  // 6. 대상 유저 id가 없음
  // 7. 대상 유저를 찾을 수 없음
  // 8. 대상 유저가 채팅방에 없음
  // 9. 대상 유저가 일반 유저가 아님
  // -------- WARNING ---- -> 알림만 표시
  @SubscribeMessage('toggleBanUser')
  async toggleBanUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
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
    await this.emitKickUserInChatRoom(client.data.chatRoomId, userId, chatRoom);
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // 3. 유저가 채팅방에 없음
  // 4. 채팅방이 없음
  // 5. chatRoomUsers가 없음
  // -------- ERROR ---- -> chat lobby로 이동
  // 5. 유저의 권한 없음
  // 6. 대상 유저 id가 없음
  // 7. 대상 유저를 찾을 수 없음
  // 8. 대상 유저가 채팅방에 없음
  // 9. 대상 유저가 일반 유저가 아님
  // -------- WARNING ---- -> 알림만 표시
  @SubscribeMessage('kickUser')
  async kickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
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

    await this.emitKickUserInChatRoom(client.data.chatRoomId, userId, chatRoom);
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // 3. 유저가 채팅방에 없음
  // 4. 채팅방이 없음
  // 5. chatRoomUsers가 없음
  // -------- ERROR ---- -> chat lobby로 이동
  // 6. 유저의 권한 없음
  // 7. 대상 유저 id가 없음
  // 8. 대상 유저를 찾을 수 없음
  // 9. 대상 유저가 채팅방에 없음
  // 10. 대상 유저가 일반 유저가 아님
  // -------- WARNING ---- -> 알림만 표시
  @SubscribeMessage('setMuteUser')
  async muteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
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
    // TODO: mute 당한 유저에게 event emit
    await this.emitMuteUserInChatRoom(
      client.data.chatRoomId,
      userId,
      chatRoomUser.mutedUntil,
    );
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // 3. 유저가 채팅방에 없음
  // 4. 채팅방이 없음
  // 5. chatRoomUsers가 없음
  // -------- ERROR ---- -> chat lobby로 이동
  // 6. 유저의 권한 없음
  // -------- WARNING ---- -> 알림만 표시
  @SubscribeMessage('updateChatRoom')
  async updateChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(ChatRoomValidationPipe) updateChatRoomDto: UpdateChatRoomDto,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
    const { chatRoom } =
      await this.chatRoomValidation.validateUserInChatRoomRole(
        client,
        ChatRoomRole.OWNER,
      );

    await this.chatRoomService.updateChatRoom(chatRoom, updateChatRoomDto);

    this.server
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
    const lobbySockets = await this.server.in('lobby').fetchSockets();
    for (const socket of lobbySockets) {
      socket.emit(
        'showMyChatRoomList',
        await this.chatRoomService.getMyChatRooms(socket.data.user),
      );
    }
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 3. 유저가 로비에 없음
  // -------- ERROR ---- -> chat lobby로 이동
  // 4. 채팅방 이름이 유효하지 않음
  // 5. 채팅방 이름이 중복됨
  // -------- WARNING ---- -> 알림만 표시
  @SubscribeMessage('createChatRoom')
  async createChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(ChatRoomValidationPipe) createChatRoomDto: CreateChatRoomDto,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
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
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 3. 채팅방 이름이 유효하지 않음
  // 4. 채팅방이 존재 하지 않음
  // 5. 채팅방 비밀번호가 틀림
  // -------- WARNING ---- -> 알림만 표시
  @UsePipes(ValidationPipe)
  @SubscribeMessage('enterChatRoom')
  async enterChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() enterChatRoomDto: EnterChatRoomDto,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
    this.ChatRoomLogger.debug(
      `[enterChatRoom] roomName: ${enterChatRoomDto.roomName}, password: ${enterChatRoomDto.password}`,
    );
    await this.chatRoomValidation.validateSocket(client);
    const chatRoom = await this.chatRoomValidation.validateChatRoom(
      enterChatRoomDto,
    );
    const chatRoomUser = await this.chatRoomService.createChatRoomUser(
      chatRoom,
      client.data.user,
      ChatRoomRole.NORMAL,
    );

    await this.clientJoinChatRoom(client, chatRoom, chatRoomUser);
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 3. 유저가 나가야하는 채팅방이 존재하지 않음
  // -------- ERROR ---- -> chat lobby로 이동
  @SubscribeMessage('enterChatLobby')
  async enterChatLobby(
    @ConnectedSocket() client: Socket,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
    await this.chatRoomValidation.validateSocket(client);
    // NOTE: 현재 유저가 속해있던 곳에서 퇴장
    await this.leaveCurrentPosition(client);
    await this.clinetJoinLobby(client);
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 3. 유저가 나가야하는 채팅방이 존재하지 않음
  // -------- ERROR ---- -> chat lobby로 이동
  @SubscribeMessage('leaveChatPage')
  async leaveChatPage(
    @ConnectedSocket() client: Socket,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
    this.ChatRoomLogger.debug(`[leaveChatPage]`);
    await this.chatRoomValidation.validateSocket(client);
    await this.leaveCurrentPosition(client);
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  @SubscribeMessage('exitChatRoom')
  async exitChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('chatRoomId') chatRoomId: string,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
    this.ChatRoomLogger.debug(`[exitChatRoom]`);
    await this.chatRoomValidation.validateSocket(client);
    if (!chatRoomId) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '채팅방 ID가 유효하지 않습니다.',
      });
    }
    const chatRoom = await this.chatRoomService.getChatRoomById(chatRoomId);
    if (!chatRoom) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '채팅방이 존재하지 않습니다.',
      });
    }
    await this.chatRoomService.deleteChatRoomUser(chatRoom, client.data.user);

    this.server
      .to(chatRoomId.toString())
      .emit(
        'getChatRoomUsers',
        await this.chatRoomService.getChatRoomUsers(chatRoom),
      );
    this.server
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
    client.emit(
      'showMyChatRoomList',
      await this.chatRoomService.getMyChatRooms(client.data.user),
    );
    client.emit(
      'showChatRoomList',
      await this.chatRoomService.getAllChatRooms(),
    );

    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 3. 대상 유저 id가 유효하지 않음
  // 4. 대상 유저를 찾을수 없음
  // -------- WARNING ---- -> 알림만 표시
  @SubscribeMessage('toggleBlockUser')
  async toggleBlockUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
    await this.chatRoomValidation.validateSocket(client);

    const receiver = await this.chatRoomValidation.validateUser(userId);

    const directMessage = await this.directMessageService.createDirectMessage(
      client.data.user,
      receiver,
    );

    this.ChatRoomLogger.debug(
      `[toggleBlockUser] ${receiver.name} blocked by ${client.data.user.name}`,
    );

    await this.directMessageService.toggleBlockUser(
      directMessage,
      client.data.user,
    );
    await this.emitDirectMessageList(client.data.user);
    await this.emitDirectMessageUsers(
      client.data.user,
      directMessage,
      client.data.chatRoomId,
    );
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 3. direct message id 가 유효하지 않음
  // 4. direct message를 찾을수 없음
  // -------- WARNING ---- -> 알림만 표시

  @SubscribeMessage('enterDirectMessage')
  async enterDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody('directMessageId') directMessageId: string,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
    const directMessage =
      await this.chatRoomValidation.validateEnterDirectMessage(
        client,
        'DM' + directMessageId,
      );

    this.ChatRoomLogger.debug(
      `[enterDirectMessage] ${client.data.user.name} enter direct message`,
    );

    await this.clientJoinDirectMessage(client, directMessage);
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 3. 유저가 DM방에 없음
  // 4. DM방 id가 유효하지 않음
  // 5. DM방이 없음
  // -------- ERROR ---- -> chat lobby로 이동
  // 6. message가 비어있거나 너무 큼
  // 7. 상대방으로 부터 block 당함
  // -------- WARNING ---- -> 알림만 표시
  @SubscribeMessage('sendDirectMessage')
  async handleDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
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
    return { status: ErrorStatus.OK, message: 'ok' };
  }

  // NOTE: error handling
  // 1. client.data.user가 없음
  // 2. client.data.chatRoomId가 없거나 소켓이 해당 room에 없음
  // -------- FATAL ---- -> 소켓 재연결
  // 3. 대상 유저 id가 유효하지 않음
  // 4. 대상 유저를 찾을수 없음
  // -------- WARNING ---- -> 알림만 표시
  @SubscribeMessage('createDirectMessage')
  async createDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody('receiverId') receiverId: string,
    @getUserBySocket() user: UserEntity,
  ) {
    client.data.user = user;
    await this.chatRoomValidation.validateSocket(client);
    const receiver = await this.chatRoomValidation.validateUser(receiverId);

    this.ChatRoomLogger.debug(
      `[createDirectMessage] ${client.data.user.name} create direct message`,
    );

    const directMessage = await this.directMessageService.createDirectMessage(
      client.data.user,
      receiver,
    );

    return {
      status: ErrorStatus.OK,
      directMessageId: directMessage.id,
      message: 'ok',
    };
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
    client.data.chatRoomId = 'none';
    client.leave(client.id);
    client.join('none');
  }

  async handleDisconnect(client: Socket) {
    this.ChatRoomLogger.log(`chat-room disconnected`);
    await this.leaveCurrentPosition(client);
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

  async clientJoinChatRoom(
    client: Socket,
    chatRoom: ChatRoomEntity,
    chatRoomUser: ChatRoomUserEntity,
  ) {
    // 이전에 있던 방에서 나가기
    await this.leaveCurrentPosition(client);

    client.leave(client.data.chatRoomId);
    client.data.chatRoomId = chatRoom.id.toString();
    client.data.where = UserWhere.CHATROOM;
    client.emit(
      'getChatRoomMessages',
      await this.chatRoomService.getMessages(chatRoom),
    );
    if (chatRoomUser.isMuted) {
      client.emit('muteUser', chatRoomUser.mutedUntil);
    }

    const isUserIn = await this.chatRoomService.isUserInChatRoom(client);
    client.join(client.data.chatRoomId);
    if (isUserIn) {
      client.emit(
        'getChatRoomUsers',
        await this.chatRoomService.getChatRoomUsers(chatRoom),
      );
      return;
    }
    await this.chatRoomService.saveChatRoomUserIsEntered(
      chatRoom,
      client.data.user,
      true,
    );
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
    client.leave(client.data.chatRoomId);
    client.data.chatRoomId = 'lobby';
    client.data.where = UserWhere.LOBBY;
    client.join('lobby');
    client.emit(
      'showChatRoomList',
      await this.chatRoomService.getAllChatRooms(),
    );
    client.emit(
      'showMyChatRoomList',
      await this.chatRoomService.getMyChatRooms(client.data.user),
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
      }
    }
    this.server
      .to(chatRoomId)
      .emit(
        'getChatRoomUsers',
        await this.chatRoomService.getChatRoomUsers(chatRoom),
      );
  }

  async emitMuteUserInChatRoom(chatRoomId: string, userId: string, date: Date) {
    const sockets = await this.server.in(chatRoomId).fetchSockets();
    for (const socket of sockets) {
      if (socket.data?.user?.id === userId) {
        socket.emit('muteUser', date);
      }
    }
  }

  async emitNotification(receiver: UserEntity, message: MessageEntity) {
    const lobbySockets = await this.server.to('lobby').fetchSockets();
    for (const socket of lobbySockets) {
      if (socket.data?.user?.id === receiver.id) {
        socket.emit('newDirectMessage', {
          id: message.directMessage.id,
          name: message.user.name,
          message: message.message,
          avatarImageUrl: message.user.avatarImageUrl,
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
          avatarImageUrl: message.user.avatarImageUrl,
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

  async emitDirectMessageUsers(
    user: UserEntity,
    directMessage: DirectMessageEntity,
    directMessageId: string,
  ) {
    const sockets = await this.server.to(directMessageId).fetchSockets();
    for (const socket of sockets) {
      if (socket.data.user.id === user.id) {
        socket.emit(
          'getDirectMessageUsers',
          await this.directMessageService.getDirectMessageUsers(
            directMessage,
            user,
          ),
        );
      }
    }
  }

  async leaveCurrentPosition(client: Socket) {
    if (client.data.where === UserWhere.LOBBY) {
      client.leave('lobby');
    } else if (client.data.where === UserWhere.CHATROOM) {
      client.leave(client.data.chatRoomId);
      await this.leaveChatRoom(client);
    } else if (client.data.where === UserWhere.DM) {
      client.leave(client.data.chatRoomId);
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
    const chatRoom = await this.chatRoomService.getChatRoomById(
      client.data.chatRoomId,
    );

    if (!chatRoom) {
      return;
    }
    this.ChatRoomLogger.debug(
      `[leaveChatRoom] ${client.data.user.name} leave chat room`,
    );

    // NOTE: 만약 해당 방에 같은 아이디로 로그인된 유저가 있다면
    // chatRoomUser를 삭제하면 안됨
    // client.leave(client.data.chatRoomId);
    const isUserIn = await this.chatRoomService.isUserInChatRoom(client);
    if (!isUserIn) {
      await this.chatRoomService.saveChatRoomUserIsEntered(
        chatRoom,
        client.data.user,
        false,
      );
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
