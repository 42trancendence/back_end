import { Logger } from '@nestjs/common';
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
import { RemoteSocket, Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { ChatRoomInfo } from '../chat-room-info';
import { ChatRoomService } from '../chat-room.service';
import { CreateChatRoomDto } from '../dto/create-chat-room.dto';
import { UpdateChatRoomDto } from '../dto/update-chat-room.dto';
import { ChatRoomType } from '../enum/chat-room-type.enum';
import { ChatRoomValidationPipe } from '../pipes/chat-room-validation.pipe';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

@WebSocketGateway({
  namespace: 'chat-room',
  cors: { origin: 'http://localhost:4000', credentials: true },
})
export class ChatRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly ChatRoomLogger = new Logger('ChatRoomLogger');

  constructor(
    private chatRoomService: ChatRoomService,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ) {
    if (!client.data?.user) {
      this.ChatRoomLogger.error('[updateChatRoom] User not found');
      return;
    }

    if (!client.data?.chatRoomId || client.data.chatRoomId === 'lobby') {
      this.ChatRoomLogger.error(
        '[updateChatRoom] Chat room에 접속해 있지 않은 유저 입니다.',
      );
      return;
    }

    const chatRoom = await this.chatRoomService.getChatRoomById(
      client.data.chatRoomId,
    );

    if (!chatRoom) {
      this.ChatRoomLogger.error('[updateChatRoom] Chat room not found');
    }

    const message = await this.chatRoomService.saveMessage(
      client.data.user,
      chatRoom,
      payload,
    );

    client.broadcast.to(client.data.chatRoomId).emit('getMessage', message);
  }

  @SubscribeMessage('toggleBanUser')
  async banUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    const isOwner = await this.chatRoomService.isChatRoomOwner(client);
    if (!isOwner) {
      throw new WsException('You are not owner of this chat room');
    }
    const banUser = await this.usersService.getUserById(userId);
    if (!banUser) {
      throw new WsException('User not found');
    }
    const isBannedUser = await this.chatRoomService.toggleBanUser(
      client.data.chatRoomId,
      banUser,
    );
    if (isBannedUser) {
      return;
    }
    await this.emitToKickUser(client.data.chatRoomId, banUser);
    this.server
      .in(client.data.chatRoomId.name)
      .emit(
        'getChatRoomUsers',
        await this.getChatRoomUsers(client.data.chatRoomId.name),
      );
  }

  @SubscribeMessage('kickUser')
  async kickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    const isOwner = await this.chatRoomService.isChatRoomOwner(client);
    if (!isOwner) {
      throw new WsException('You are not owner of this chat room');
    }
    const kickUser = await this.usersService.getUserById(userId);
    if (!kickUser) {
      throw new WsException('User not found');
    }
    await this.emitToKickUser(client.data.chatRoomId, kickUser);
    this.server
      .in(client.data.chatRoomId.name)
      .emit(
        'getChatRoomUsers',
        await this.getChatRoomUsers(client.data.chatRoomId.name),
      );
  }

  @SubscribeMessage('toggleMuteUser')
  async muteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    const isOwner = await this.chatRoomService.isChatRoomOwner(client);
    if (!isOwner) {
      throw new WsException('You are not owner of this chat room');
    }

    const muteUser = await this.usersService.getUserById(userId);
    if (!muteUser) {
      throw new WsException('User not found');
    }
    const isMuted = await this.chatRoomService.toggleMuteUser(
      client.data.chatRoomId,
      muteUser,
    );
    if (isMuted) {
      await this.emitToMuteUser(client.data.chatRoomId, muteUser, 'off');
    } else {
      await this.emitToMuteUser(client.data.chatRoomId, muteUser, 'on');
    }
  }

  @SubscribeMessage('updateChatRoom')
  async updateChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(ChatRoomValidationPipe) updateChatRoomDto: UpdateChatRoomDto,
  ) {
    if (!client.data?.user) {
      this.ChatRoomLogger.error('[updateChatRoom] User not found');
      return;
    }

    if (
      !client.data?.chatRoomId ||
      client.data.chatRoomId === 'lobby' ||
      client.data.chatRoomId !== updateChatRoomDto.id
    ) {
      this.ChatRoomLogger.error(
        '[updateChatRoom] Chat room에 접속해 있지 않은 유저 입니다.',
      );
      return;
    }

    const chatRoom = await this.chatRoomService.getChatRoomById(
      updateChatRoomDto.id,
    );

    if (!chatRoom) {
      this.ChatRoomLogger.error('[updateChatRoom] Chat room not found');
      return;
    }

    if (chatRoom.owner.id !== client.data.user.id) {
      throw new WsException('You are not owner of this chat room');
    }

    await this.chatRoomService.updateChatRoom(chatRoom, updateChatRoomDto);
    this.server
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
  }

  @SubscribeMessage('deleteChatRoom')
  async deleteChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomId') roomId: string,
  ) {
    if (!client.data?.user) {
      this.ChatRoomLogger.error('[deleteChatRoom] User not found');
      return;
    }

    if (
      !client.data?.chatRoomId ||
      client.data.chatRoomId === 'lobby' ||
      client.data.chatRoomId !== roomId
    ) {
      this.ChatRoomLogger.error(
        '[updateChatRoom] Chat room에 접속해 있지 않은 유저 입니다.',
      );
      return;
    }

    const chatRoom = await this.chatRoomService.getChatRoomById(roomId);
    if (!chatRoom) {
      this.ChatRoomLogger.error('[deleteChatRoom] Chat room not found');
      return;
    }

    if (chatRoom.owner.id !== client.data.user.id) {
      throw new WsException('You are not owner of this chat room');
    }

    await this.chatRoomService.deleteChatRoom(chatRoom);

    this.server
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());

    const sockets = await this.server.in(client.data.chatRoomId).fetchSockets();
    for (const socket of sockets) {
      socket.emit('kickUser');
      await this.clinetJoinLobby(socket);
    }
  }

  @SubscribeMessage('createChatRoom')
  async createChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(ChatRoomValidationPipe) createChatRoomDto: CreateChatRoomDto,
  ) {
    this.ChatRoomLogger.debug(
      `[createChatRoom] createChatRoomDto: ${createChatRoomDto}`,
    );

    if (!client.data?.user) {
      this.ChatRoomLogger.debug('[createChatRoom] 로그인이 필요합니다.');
      return;
    }

    if (client.data?.chatRoomId !== 'lobby') {
      this.ChatRoomLogger.debug(
        `[createChatRoom] ${client.data?.chatRoom} 비정상적인 접근입니다.`,
      );
      return;
    }

    const isDuplicated = await this.chatRoomService.getChatRoomByName(
      createChatRoomDto.name,
    );
    if (isDuplicated) {
      this.ChatRoomLogger.debug(
        '[createChatRoom] 이미 존재하는 chat-room 이름 입니다.',
      );
      return;
    }

    await this.chatRoomService.createChatRoom(
      createChatRoomDto,
      client.data.user,
    );

    this.ChatRoomLogger.debug(
      `[createChatRoom] User ${client.data.user.name} created chat room`,
    );

    await this.clientJoinChatRoom(
      client,
      createChatRoomDto.name,
      createChatRoomDto.password,
    );
    this.server
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
  }

  @SubscribeMessage('enterChatRoom')
  async enterChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
    @MessageBody('password') password: string,
  ) {
    if (!client.data?.user) {
      this.ChatRoomLogger.debug('[enterChatRoom] 로그인이 필요합니다.');
      return;
    }
    this.ChatRoomLogger.debug(
      `[enterChatRoom] roomName: ${roomName}, user: ${client.data.user.name}`,
    );
    if (client.data?.chatRoomId !== 'lobby') {
      this.ChatRoomLogger.debug(
        `[enterChatRoom] ${client.data.chatRoomId} 비정상적인 접근입니다. `,
      );
    }
    await this.clientJoinChatRoom(client, roomName, password);
  }

  @SubscribeMessage('leaveChatRoom')
  async leaveChatRoom(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      this.ChatRoomLogger.debug('[leaveChatRoom] 로그인이 필요합니다.');
      return;
    }

    if (client.data?.chatRoomId === 'lobby') {
      this.ChatRoomLogger.debug('[leaveChatRoom] chatRoom not found');
      return;
    }
    this.ChatRoomLogger.debug(
      `[leaveChatRoom] roomName: ${client.data.chatRoomId} user: ${client.data.user.name}`,
    );
    await this.clinetJoinLobby(client);
  }

  async handleConnection(client: Socket) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      this.ChatRoomLogger.debug('[handleConnection] user not found');
      client.disconnect();
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

  async clientJoinChatRoom(
    client: Socket,
    chatRoomName: string,
    password: string,
  ) {
    const chatRoom = await this.chatRoomService.getChatRoomByName(chatRoomName);

    if (!chatRoom) {
      this.ChatRoomLogger.debug('존재하지 않는 채팅방입니다.');
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    if (
      chatRoom.type === ChatRoomType.PROTECTED &&
      bcrypt.compareSync(password, chatRoom.password) === false
    ) {
      this.ChatRoomLogger.debug('비밀번호가 틀렸습니다.');
      throw new WsException('비밀번호가 틀렸습니다.');
    }
    chatRoom.bannedUsers.forEach((bannedUser) => {
      if (bannedUser.id === client.data.user.id) {
        this.ChatRoomLogger.debug('해당 방에서 차단된 사용자입니다.');
        throw new WsException('해당 방에서 차단된 사용자입니다.');
      }
    });

    client.leave('lobby');
    client.data.chatRoomId = chatRoom.id;
    client.join(chatRoom.id);
    this.server
      .to(chatRoom.id)
      .emit('getChatRoomUsers', await this.getChatRoomUsers(chatRoom.id));
    //TODO: 가져올 메시지 개수 제한, message repository에서 가져오는 방식으로 변경
    client.emit('getChatRoomMessages', chatRoom.messages);
    chatRoom.mutedUsers.forEach((mutedUser) => {
      if (mutedUser.id === client.data.user.id) {
        client.emit('setMuteUser', 'on');
      }
    });
  }

  async clinetJoinLobby(client: Socket | RemoteSocket<DefaultEventsMap, any>) {
    if (client.data.chatRoomId !== 'lobby') {
      this.server
        .to(client.data.chatRoomId)
        .emit(
          'getChatRoomUsers',
          await this.getChatRoomUsers(client.data.chatRoomId),
        );
      client.leave(client.data.chatRoomId);
    }
    client.data.chatRoomId = 'lobby';
    client.join('lobby');
    client.emit(
      'showChatRoomList',
      await this.chatRoomService.getAllChatRooms(),
    );
  }

  async getChatRoomUsers(chatRoomId: string) {
    const allSockets = await this.server.in(chatRoomId).fetchSockets();
    const chatRoomUsers = new Set<string>();
    for (const socket of allSockets) {
      socket.data?.user && chatRoomUsers.add(socket.data.user.name);
    }

    const serializedSet = [...chatRoomUsers.keys()];
    return serializedSet;
  }

  async emitToKickUser(chatRoom: ChatRoomInfo, user: UserEntity) {
    const sockets = await this.server.in(chatRoom.name).fetchSockets();
    for (const socket of sockets) {
      if (socket.data?.user?.id === user.id) {
        socket.leave(chatRoom.name);
        socket.join('lobby');
        socket.emit('kickUser', chatRoom.name);
      }
    }
  }

  async emitToMuteUser(
    chatRoom: ChatRoomInfo,
    user: UserEntity,
    setMute: string,
  ) {
    const sockets = await this.server.in(chatRoom.name).fetchSockets();
    for (const socket of sockets) {
      if (socket.data?.user?.id === user.id) {
        socket.emit('setMuteUser', setMute);
      }
    }
  }
}
