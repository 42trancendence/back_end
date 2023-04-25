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
import { MuteUserEntity } from './muteUser.entity';

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

  @ManyToOne(() => UserEntity, (user) => user.id, {
    onDelete: 'CASCADE',
    eager: true,
  })
  owner: UserEntity;

  @OneToMany(() => UserEntity, (user) => user.id)
  admin: UserEntity[];

  @OneToMany(() => MessageEntity, (message) => message.chatRoom)
  messages: MessageEntity[];

  @Exclude()
  @OneToMany(() => UserEntity, (user) => user.id, { nullable: true })
  bannedUsers: UserEntity[];

  @Exclude()
  @OneToMany(() => MuteUserEntity, (muteUser) => muteUser.chatRoom, {
    nullable: true,
  })
  mutedUsers: MuteUserEntity[];
}
