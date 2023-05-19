import { Exclude } from 'class-transformer';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ChatRoomType } from '../enum/chat-room-type.enum';
import { ChatRoomUserEntity } from './chatRoomUser.entity';
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

  @OneToMany(() => MessageEntity, (message) => message.chatRoom)
  messages: MessageEntity[];

  @OneToMany(() => ChatRoomUserEntity, (chatRoomUser) => chatRoomUser.chatRoom)
  users: ChatRoomUserEntity[];
}
