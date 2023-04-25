import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateChatRoomDto } from '../dto/create-chat-room.dto';
import { MuteUserEntity } from '../entities/muteUser.entity';
import { ChatRoomEntity } from '../entities/chatRoom.entity';
import { ChatRoomType } from '../enum/chat-room-type.enum';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class ChatRoomRepository extends Repository<ChatRoomEntity> {
  constructor(
    dataSource: DataSource,
    @InjectRepository(MuteUserEntity)
    private muteUserRepository: Repository<MuteUserEntity>,
  ) {
    super(ChatRoomEntity, dataSource.createEntityManager());
  }

  async createNewChatRoom(
    createChatRoomDto: CreateChatRoomDto,
    user: UserEntity,
  ): Promise<ChatRoomEntity> {
    const newChatRoom = new ChatRoomEntity();

    newChatRoom.name = createChatRoomDto.name;
    newChatRoom.type = createChatRoomDto.type;
    newChatRoom.owner = user;
    newChatRoom.admin.push(user);
    newChatRoom.password = createChatRoomDto.password;
    await this.save(newChatRoom);
    return newChatRoom;
  }

  async getMutedUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<MuteUserEntity> {
    return await this.muteUserRepository.findOne({
      where: { chatRoom: chatRoom, user: user },
    });
  }

  async getAllChatRooms(): Promise<ChatRoomEntity[]> {
    return await this.find({
      where: [{ type: ChatRoomType.PUBLIC }, { type: ChatRoomType.PROTECTED }],
    });
  }

  async getChatRoomById(chatRoomId: string): Promise<ChatRoomEntity> {
    const id = parseInt(chatRoomId);
    return await this.findOne({ where: { id: id } });
  }

  async getChatRoomByName(chatRoomName: string): Promise<ChatRoomEntity> {
    return await this.findOne({ where: { name: chatRoomName } });
  }

  async deleteChatRoom(chatRoom: ChatRoomEntity): Promise<void> {
    await this.remove(chatRoom);
  }

  async toggleBanUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<boolean> {
    if (chatRoom.bannedUsers.includes(user)) {
      const index = chatRoom.bannedUsers.indexOf(user);
      chatRoom.bannedUsers.splice(index, 1);
      await this.save(chatRoom);
      return true;
    }
    chatRoom.bannedUsers.push(user);
    await this.save(chatRoom);
    return false;
  }

  async deleteMutedUser(muteUser: MuteUserEntity): Promise<void> {
    await this.muteUserRepository.remove(muteUser);
  }

  async setAdminUser(
    chatRoom: ChatRoomEntity,
    user: UserEntity,
  ): Promise<void> {
    if (chatRoom.admin.includes(user)) {
      throw new WsException('User is already admin');
    }
    chatRoom.admin.push(user);
    await this.save(chatRoom);
  }

  async setMuteUser(chatRoom: ChatRoomEntity, user: UserEntity): Promise<void> {
    const muteUser = await this.getMutedUser(chatRoom, user);
    if (muteUser) {
      throw new WsException('User is already muted');
    }

    const newMuteUser = new MuteUserEntity();
    newMuteUser.chatRoom = chatRoom;
    newMuteUser.user = user;
    newMuteUser.date = new Date();
    await this.muteUserRepository.save(newMuteUser);
  }
}
