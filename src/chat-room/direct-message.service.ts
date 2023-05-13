import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { UserEntity } from 'src/users/entities/user.entity';
import { DirectMessageEntity } from './entities/directMessage.entity';
import { ErrorStatus } from './enum/error-status.enum';
import { DirectMessageRepository } from './repository/directMessage.repository';
import { MessageRepository } from './repository/message.repository';

@Injectable()
export class DirectMessageService {
  constructor(
    private directMessageRepository: DirectMessageRepository,
    private messageRepository: MessageRepository,
  ) {}

  async getDirectMessageById(
    directMessageId: string,
  ): Promise<DirectMessageEntity> {
    if (!directMessageId) {
      throw new WsException({
        status: ErrorStatus.ERROR,
        message: 'direct message Id가 유효하지 않습니다.',
      });
    }
    const directMessage =
      await this.directMessageRepository.getDirectMessageById(directMessageId);
    if (!directMessage) {
      throw new WsException({
        status: ErrorStatus.ERROR,
        message: '존재하지 않는 direct message입니다.',
      });
    }
    return directMessage;
  }

  async saveMessage(
    user: UserEntity,
    directMessage: DirectMessageEntity,
    payload: string,
  ): Promise<any> {
    if (!payload || payload.length >= 1000) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '메세지가 비어있거나 너무 큽니다.',
      });
    }
    if (directMessage.user1.id === user.id && directMessage.isBlockedByUser2) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '상대방으로 부터 차단 당했습니다.',
      });
    }

    if (directMessage.user2.id === user.id && directMessage.isBlockedByUser1) {
      throw new WsException({
        status: ErrorStatus.WARNING,
        message: '상대방으로 부터 차단 당했습니다.',
      });
    }

    return await this.messageRepository.saveDmMessage(
      user,
      payload,
      directMessage,
    );
  }

  async createDirectMessage(
    sender: UserEntity,
    receiver: UserEntity,
  ): Promise<DirectMessageEntity> {
    const directMessage = await this.directMessageRepository.getDirectMessage(
      sender,
      receiver,
    );

    if (!directMessage) {
      return await this.directMessageRepository.createDirectMessage(
        sender,
        receiver,
      );
    }
    return directMessage;
  }
  async getDirectMessage(
    user1: UserEntity,
    user2: UserEntity,
  ): Promise<DirectMessageEntity> {
    return await this.directMessageRepository.getDirectMessage(user1, user2);
  }

  async getDirectMessages(user: UserEntity): Promise<any> {
    const directMessages = await this.directMessageRepository.getDirectMessages(
      user,
    );
    const directChatRooms = await Promise.all(
      directMessages.map(async (dm) => {
        const otherUser = dm.user1.id === user.id ? dm.user2 : dm.user1;
        const isBlocked =
          dm.user1.id === user.id ? dm.isBlockedByUser1 : dm.isBlockedByUser2;
        return {
          id: dm.id,
          otherUserId: otherUser.id,
          otherUserName: otherUser.name,
          otherUserAvatarImageUrl: otherUser.avatarImageUrl,
          isBlocked,
        };
      }),
    );
    return directChatRooms;
  }

  async toggleBlockUser(
    directMessage: DirectMessageEntity,
    user: UserEntity,
  ): Promise<void> {
    await this.directMessageRepository.toggleBlockUser(directMessage, user);
  }
  async getDirectMessageUsers(
    directMessage: DirectMessageEntity,
    me: UserEntity,
  ): Promise<any> {
    const isBlocked =
      directMessage.user1.id === me.id
        ? directMessage.isBlockedByUser1
        : directMessage.isBlockedByUser2;
    const users = {
      user1: {
        id: directMessage.user1.id,
        name: directMessage.user1.name,
      },
      user2: {
        id: directMessage.user2.id,
        name: directMessage.user2.name,
      },
      isBlocked,
    };
    return users;
  }

  async getMessages(directMessage: DirectMessageEntity) {
    return await this.messageRepository.getDmMessages(directMessage.id);
  }
}
