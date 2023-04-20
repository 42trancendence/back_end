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
import { Server, Socket } from 'socket.io';
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
    if (
      !client.data?.user ||
      !client.data.chatRoom ||
      client.data.chatRoom.name === 'lobby'
    ) {
      return;
    }
    const message = await this.chatRoomService.saveMessage(
      client.data.user,
      client.data.chatRoom,
      payload,
    );
    client.broadcast.to(client.data.chatRoom.name).emit('getMessage', message);
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
      client.data.chatRoom,
      banUser,
    );
    if (isBannedUser) {
      return;
    }
    await this.emitToKickUser(client.data.chatRoom, banUser);
    this.server
      .in(client.data.chatRoom.name)
      .emit(
        'getChatRoomUsers',
        await this.getChatRoomUsers(client.data.chatRoom.name),
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
    await this.emitToKickUser(client.data.chatRoom, kickUser);
    this.server
      .in(client.data.chatRoom.name)
      .emit(
        'getChatRoomUsers',
        await this.getChatRoomUsers(client.data.chatRoom.name),
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
      client.data.chatRoom,
      muteUser,
    );
    if (isMuted) {
      await this.emitToMuteUser(client.data.chatRoom, muteUser, 'off');
    } else {
      await this.emitToMuteUser(client.data.chatRoom, muteUser, 'on');
    }
  }

  @SubscribeMessage('updateChatRoom')
  async updateChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody(ChatRoomValidationPipe) updateChatRoomDto: UpdateChatRoomDto,
  ) {
    const chatRoom = await this.chatRoomService.getChatRoomByName(
      updateChatRoomDto.name,
    );
    if (chatRoom.owner.id !== client.data.user.id) {
      throw new WsException('You are not owner of this chat room');
    }
    await this.chatRoomService.updateChatRoom(chatRoom, updateChatRoomDto);
    client
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
  }

  @SubscribeMessage('deleteChatRoom')
  async deleteChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('roomName') roomName: string,
  ) {
    const chatRoom = await this.chatRoomService.getChatRoomByName(roomName);

    if (chatRoom.owner.id !== client.data.user.id) {
      throw new WsException('You are not owner of this chat room');
    }
    await this.chatRoomService.deleteChatRoom(chatRoom);
    client
      .to('lobby')
      .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
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
      this.ChatRoomLogger.debug('로그인이 필요합니다.');
      return;
    }

    // NOTE: 이미 존재하는 chat-room 이름인지 확인
    const isDuplicated = await this.chatRoomService.getChatRoomByName(
      createChatRoomDto.name,
    );
    if (isDuplicated) {
      this.ChatRoomLogger.debug('이미 존재하는 chat-room 이름 입니다.');
      throw new WsException('이미 존재하는 chat-room 이름 입니다.');
    }

    await this.chatRoomService.createChatRoom(
      createChatRoomDto,
      client.data.user,
    );
    this.ChatRoomLogger.debug(
      `User ${client.data.user.name} created chat room`,
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
    if (client.rooms.size > 1) {
      client.leave(client.data.chatRoom);
    }
    await this.clientJoinChatRoom(client, roomName, password);
  }

  @SubscribeMessage('leaveChatRoom')
  async leaveChatRoom(@ConnectedSocket() client: Socket) {
    if (!client.data?.user) {
      this.ChatRoomLogger.debug('[leaveChatRoom] 로그인이 필요합니다.');
      return;
    }

    if (!client.data?.chatRoom || client.data?.chatRoom === 'lobby') {
      this.ChatRoomLogger.debug('[leaveChatRoom] chatRoom not found');
    }
    const roomName = client.data.chatRoom;
    this.ChatRoomLogger.debug(
      `[leaveChatRoom] roomName: ${roomName} user: ${client.data.user.name}`,
    );

    client.leave(roomName);
    this.server
      .to(roomName)
      .emit('getChatRoomUsers', await this.getChatRoomUsers(roomName));
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
        this.ChatRoomLogger.debug('차단된 사용자입니다.');
        throw new WsException('차단된 사용자입니다.');
      }
    });
    client.leave(client.data.chatRoom);
    client.data.chatRoom = chatRoomName;
    client.join(chatRoomName);
    client
      .to(chatRoomName)
      .emit('getChatRoomUsers', await this.getChatRoomUsers(chatRoomName));
    //TODO: 가져올 메시지 개수 제한
    client.to(chatRoomName).emit('getChatRoomMessages', chatRoom.messages);
    chatRoom.mutedUsers.forEach((mutedUser) => {
      if (mutedUser.id === client.data.user.id) {
        client.emit('setMuteUser', 'on');
      }
    });
    this.ChatRoomLogger.debug(chatRoom.messages);
  }

  async clinetJoinLobby(client: Socket) {
    client.data.chatRoom = 'lobby';
    client.join('lobby');
    client.emit(
      'showChatRoomList',
      await this.chatRoomService.getAllChatRooms(),
    );
  }

  async getChatRoomUsers(roomName: string) {
    const allSockets = await this.server.in(roomName).fetchSockets();
    const chatRoomUsers = new Set<string>();
    for (const socket of allSockets) {
      socket.data.user && chatRoomUsers.add(socket.data.user.name);
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
