import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';
import { ChatRoomService } from './chat-room.service';
import { DirectMessageService } from './direct-message.service';
import { ChatRoomEntity } from './entities/chatRoom.entity';
import { ChatRoomUserEntity } from './entities/chatRoomUser.entity';
import { ChatRoomRole } from './enum/chat-room-role.enum';
import { ChatRoomType } from './enum/chat-room-type.enum';
import { UserWhere } from './enum/user-where.enum';
import * as bcrypt from 'bcrypt';
import { EnterChatRoomDto } from './dto/enter-chat-room.dto';
import { ErrorStatus } from './enum/error-status.enum';
import { UserEntity } from 'src/users/entities/user.entity';

@Injectable()
export class ChatRoomValidation {
  constructor(
    private chatRoomService: ChatRoomService,
    private usersService: UsersService,
    private directMessageService: DirectMessageService,
  ) {}

  async validateSocket(client: Socket) {
    if (!client.data?.user) {
      throw new WsException({
        status: ErrorStatus.FATAL,
        message: '소켓에 유저 데이터가 존재하지 않습니다.',
      });
    }

    if (!client.data?.chatRoomId || !client.rooms.has(client.data.chatRoomId)) {
      throw new WsException({
        status: ErrorStatus.FATAL,
        message: '소켓이 room에 속해있지 않습니다.',
      });
    }
  }

  async validateChatRoom(enterChatRoomDto: EnterChatRoomDto) {
    if (!enterChatRoomDto.roomName || enterChatRoomDto.roomName.length >= 20) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '채팅방 이름이 유효하지 않습니다.',
      });
    }
    const chatRoom = await this.chatRoomService.getChatRoomByName(
      enterChatRoomDto.roomName,
    );

    if (!chatRoom) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '존재하지 않는 채팅방입니다.',
      });
    }
    if (
      chatRoom.type === ChatRoomType.PROTECTED &&
      bcrypt.compareSync(enterChatRoomDto.password, chatRoom.password) === false
    ) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '비밀번호가 틀렸습니다.',
      });
    }
    return chatRoom;
  }

  async validateUser(userId: string): Promise<UserEntity> {
    if (!userId) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '대상 유저 ID가 유효하지 않습니다.',
      });
    }
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '대상 유저를 찾을 수 없습니다.',
      });
    }
    return user;
  }

  async validateUserIsNormal(
    userId: string,
    chatRoom: ChatRoomEntity,
  ): Promise<ChatRoomUserEntity> {
    const user = await this.validateUser(userId);
    const chatRoomUser = await this.chatRoomService.getChatRoomUser(
      chatRoom,
      user,
    );
    if (!chatRoomUser) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '대상 유저가 채팅방에 속해있지 않습니다.',
      });
    }
    if (chatRoomUser.role !== ChatRoomRole.NORMAL) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '대상 유저가 일반 유저가 아닙니다.',
      });
    }
    return chatRoomUser;
  }

  async validateUserInLobby(client: Socket) {
    await this.validateSocket(client);
    if (client.data?.where !== UserWhere.LOBBY) {
      throw new WsException({
        status: ErrorStatus.ERROR,
        message: '유저가 로비에 있지 않습니다.',
      });
    }
  }

  async validateUserInDirectMessage(client: Socket): Promise<any> {
    await this.validateSocket(client);
    if (client.data?.where !== UserWhere.DM) {
      throw new WsException({
        status: ErrorStatus.ERROR,
        message: '유저가 DM에 있지 않습니다.',
      });
    }

    const directMessage = await this.directMessageService.getDirectMessageById(
      client.data.chatRoomId,
    );

    const receiver =
      directMessage.user1.id === client.data.user.id
        ? directMessage.user2
        : directMessage.user1;
    return { directMessage, receiver };
  }

  async validateUserInChatRoom(client: Socket): Promise<any> {
    await this.validateSocket(client);
    if (client.data?.where !== UserWhere.CHATROOM) {
      throw new WsException({
        status: ErrorStatus.ERROR,
        message: '유저가 채팅방에 있지 않습니다.',
      });
    }

    const chatRoom = await this.chatRoomService.getChatRoomById(
      client.data.chatRoomId,
    );
    if (!chatRoom) {
      throw new WsException({
        status: ErrorStatus.ERROR,
        message: '채팅방을 찾을 수 없습니다.',
      });
    }

    const chatRoomUser = await this.chatRoomService.getChatRoomUser(
      chatRoom,
      client.data.user,
    );
    if (!chatRoomUser) {
      throw new WsException({
        status: ErrorStatus.ERROR,
        message: '채팅방에 속해있지 않습니다.',
      });
    }
    return { chatRoom, chatRoomUser };
  }

  async validateUserInChatRoomRole(client: Socket, chatRoomRole: ChatRoomRole) {
    const { chatRoom, chatRoomUser } = await this.validateUserInChatRoom(
      client,
    );
    if (chatRoomUser.role > chatRoomRole) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '유저의 권한이 없습니다.',
      });
    }
    return { chatRoom, chatRoomUser };
  }

  async validateCreateChatRoom(client: Socket, chatRoomName: string) {
    await this.validateUserInLobby(client);
    if (!chatRoomName || chatRoomName.length >= 20) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '유효하지 않은 채팅방 이름 입니다.',
      });
    }
    const isDuplicatedName = await this.chatRoomService.getChatRoomByName(
      chatRoomName,
    );
    if (isDuplicatedName) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '이미 존재하는 채팅방 이름입니다.',
      });
    }
  }

  async validateEnterDirectMessage(client: Socket, directMessageId: string) {
    await this.validateSocket(client);
    const directMessage = await this.directMessageService.getDirectMessageById(
      directMessageId,
    );
    return directMessage;
  }
}
