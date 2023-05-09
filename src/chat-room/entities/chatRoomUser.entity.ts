import { UserEntity } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChatRoomRole } from '../enum/chat-room-role.enum';
import { ChatRoomEntity } from './chatRoom.entity';

@Entity({ name: 'chat_room_user' })
export class ChatRoomUserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.id, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @ManyToOne(() => ChatRoomEntity, (chatRoom) => chatRoom.users, {
    onDelete: 'CASCADE',
  })
  chatRoom: ChatRoomEntity;

  @Column()
  role: ChatRoomRole;

  @Column({ default: false })
  isMuted: boolean;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ nullable: true })
  mutedUntil: Date;
}
