import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { ChatRoomEntity } from './chatRoom.entity';
import { DirectMessageEntity } from './directMessage.entity';

@Entity({ name: 'messages' })
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.id, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @ManyToOne(() => ChatRoomEntity, (chatRoom) => chatRoom.messages, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  chatRoom: ChatRoomEntity;

  @ManyToOne(
    () => DirectMessageEntity,
    (directMessage) => directMessage.messages,
    { onDelete: 'CASCADE', nullable: true },
  )
  directMessage: DirectMessageEntity;

  @Column()
  message: string;

  @CreateDateColumn()
  timestamp: Date;
}
