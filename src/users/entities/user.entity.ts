import { ChatRoomEntity } from 'src/chat-room/entities/chatRoom.entity';
import { GameStatsEntity } from 'src/game/entities/gameStats.entity';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Status } from '../enum/status.enum';
import { FriendShipEntity } from './friendship.entity';

@Entity('User')
export class UserEntity {
  @PrimaryColumn()
  id: string;

  @Column({ length: 30 })
  name: string;

  @Column({ length: 60, nullable: true })
  email: string;

  @Column({ length: 60, nullable: true })
  twoFactorAuthCode: string;

  @Column({ name: 'avatar_image_url' })
  avatarImageUrl: string;

  @Column({ name: 'registration_date' })
  registrationDate: Date;

  @Column()
  isVerified: boolean;

  @OneToMany(() => GameStatsEntity, (game) => game.id)
  gameStats: GameStatsEntity[];

  @Column({ default: Status.OFFLINE })
  status: Status;

  // @OneToMany(() => GameSessionEntity, (gameSession) => gameSession.winner)
  // wonGames: GameSessionEntity[];

  @OneToMany(() => FriendShipEntity, (friendship) => friendship.user, {
    eager: true,
  })
  friendships: FriendShipEntity[];

  @OneToMany(() => FriendShipEntity, (friendship) => friendship.friend, {
    eager: true,
  })
  friendOf: FriendShipEntity[];

  @OneToMany(() => ChatRoomEntity, (chatRoom) => chatRoom.owner)
  chatRooms: ChatRoomEntity[];
  username: any;
}
