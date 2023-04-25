import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FriendShipStatus } from '../enum/friendShipStatus.enum';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity({ name: 'friendships' })
export class FriendShipEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.friendships, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.friendOf, {
    onDelete: 'CASCADE',
  })
  friend: UserEntity;

  @Column()
  status: FriendShipStatus;
}
