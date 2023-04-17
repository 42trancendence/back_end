import { Exclude } from 'class-transformer';
import { UserEntity } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { ChatRoomType } from '../enum/chat-room-type.enum';
import { MessageEntity } from './message.entity';

@Entity({ name: 'chat_rooms' })
export class ChatRoomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  type: ChatRoomType;

  @Exclude()
  @Column({ nullable: true })
  password: string;

  @ManyToOne(() => UserEntity, (user) => user.chatRooms, { eager: true })
  owner: UserEntity;

  @OneToMany(() => MessageEntity, (message) => message.chatRoom)
  messages: MessageEntity[];

  @Exclude()
  @ManyToOne(() => UserEntity, (user) => user.bannedChatRooms)
  bannedUsers: UserEntity[];

  @Exclude()
  @ManyToOne(() => UserEntity, (user) => user.kickedChatRooms)
  kickedUsers: UserEntity[];

  @Exclude()
  @ManyToOne(() => UserEntity, (user) => user.mutedChatRooms)
  mutedUsers: UserEntity[];
}
