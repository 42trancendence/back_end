import { UserEntity } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChatRoomEntity } from './chatRoom.entity';

@Entity({ name: 'muted_users' })
export class MuteUserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE' })
  user: UserEntity;

  @ManyToOne(() => ChatRoomEntity, (chatRoom) => chatRoom.mutedUsers, {
    onDelete: 'CASCADE',
  })
  chatRoom: ChatRoomEntity;

  @Column()
  date: Date;
}
