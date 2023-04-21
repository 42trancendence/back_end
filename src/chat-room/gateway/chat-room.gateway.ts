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
import { ChatRoomService } from '../chat-room.service';
import { CreateChatRoomDto } from '../dto/create-chat-room.dto';
import { UpdateChatRoomDto } from '../dto/update-chat-room.dto';
import { ChatRoomValidationPipe } from '../pipes/chat-room-validation.pipe';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { ChatRoomValidation } from '../chat-room.validation';

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

  @SubscribeMessage('toggleBanUser')
  async banUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const chatRoom = await this.chatRoomValidation.validateChatRoomOwnerShip(
        client,
      );

      const banUser = await this.usersService.getUserById(userId);
      if (!banUser) {
        throw new WsException('User not found');
      }

      if (!(await this.chatRoomService.toggleBanUser(chatRoom, banUser))) {
        await this.emitEventToChatRoomUser(
          client.data.chatRoomId,
          'kickUser',
          null,
          banUser.id,
          false,
        );
      }

      this.server
        .to(client.data.chatRoomId)
        .emit(
          'getChatRoom',
          await this.chatRoomService.getChatRoomById(client.data.chatRoomId),
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
      await this.chatRoomValidation.validateChatRoomOwnerShip(client);

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
          'getChatRoom',
          await this.chatRoomService.getChatRoomById(client.data.chatRoomId),
        );
    } catch (error) {
      this.ChatRoomLogger.error(`[kickUser] ${error.message}`);
    }
  }

  @SubscribeMessage('toggleMuteUser')
  async muteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody('userId') userId: string,
  ) {
    try {
      const chatRoom = await this.chatRoomValidation.validateChatRoomOwnerShip(
        client,
      );

      const muteUser = await this.usersService.getUserById(userId);
      if (!muteUser) {
        throw new WsException('User not found');
      }

      // NOTE: if isMuted is true, already muted, so we need to unmute
      const isMuted = await this.chatRoomService.toggleMuteUser(
        chatRoom,
        muteUser,
      );

      await this.emitEventToChatRoomUser(
        client.data.chatRoomId,
        'muteUser',
        !isMuted,
        muteUser.id,
        false,
      );
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

  @SubscribeMessage('deleteChatRoom')
  async deleteChatRoom(@ConnectedSocket() client: Socket) {
    try {
      const chatRoom = await this.chatRoomValidation.validateChatRoomOwnerShip(
        client,
      );

      await this.chatRoomService.deleteChatRoom(chatRoom);

      this.server
        .to('lobby')
        .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());

      await this.emitEventToChatRoomUser(
        client.data.chatRoomId,
        'kickUser',
        null,
        null,
        true,
      );
    } catch (error) {
      this.ChatRoomLogger.error(`[deleteChatRoom] ${error.message}`);
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

      this.server
        .to('lobby')
        .emit('showChatRoomList', await this.chatRoomService.getAllChatRooms());
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
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    if (bcrypt.compareSync(password, chatRoom.password) === false) {
      throw new WsException('비밀번호가 틀렸습니다.');
    }
    chatRoom.bannedUsers.forEach((bannedUser) => {
      if (bannedUser.id === client.data.user.id) {
        throw new WsException('해당 방에서 차단된 사용자입니다.');
      }
    });

    client.leave('lobby');
    client.data.chatRoomId = chatRoom.id.toString();
    client.join(client.data.chatRoomId);
    this.server
      .to(client.data.chatRoomId)
      .emit(
        'getChatRoomUsers',
        await this.getChatRoomUsers(client.data.chatRoomId),
      );
    //TODO: 가져올 메시지 개수 제한, message repository에서 가져오는 방식으로 변경
    client.emit('getChatRoomMessages', chatRoom.messages);
    chatRoom.mutedUsers.forEach((mutedUser) => {
      if (mutedUser.id === client.data.user.id) {
        client.emit('muteUser', true);
      }
    });
  }

  async clinetJoinLobby(client: Socket | RemoteSocket<DefaultEventsMap, any>) {
    if (client.data.chatRoomId !== 'lobby') {
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
