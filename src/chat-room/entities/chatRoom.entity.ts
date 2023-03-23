import { UserEntity } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { MessageEntity } from './message.entity';

@Entity({ name: 'chat_rooms' })
export class ChatRoomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ name: 'is_private' })
  isPrivate: boolean;

  @Column({ nullable: true })
  password: string;

  @ManyToOne(() => UserEntity, (user) => user.chatRooms, { eager: true })
  owner: UserEntity;

  @OneToMany(() => MessageEntity, (message) => message.chatRoom, {
    eager: true,
  })
  messages: MessageEntity[];
}
