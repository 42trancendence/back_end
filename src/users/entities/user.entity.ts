import { ChatRoomEntity } from 'src/chat-room/entities/chatRoom.entity';
import { GameSessionEntity } from 'src/game/entities/game-session.entity';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { FriendShipEntity } from './friendship.entity';

@Entity('User')
export class UserEntity {
  @PrimaryColumn()
  id: string;

  @Column({ length: 30 })
  name: string;

  @Column({ length: 60, nullable: true })
  email: string;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ length: 60, nullable: true })
  twoFactorAuthCode: string;

  @Column({ name: 'avatar_image_url' })
  avatarImageUrl: string;

  @Column({ name: 'registration_date' })
  registrationDate: Date;

  @Column()
  isVerified: boolean;

  @OneToMany(() => GameSessionEntity, (gameSession) => gameSession.winner)
  wonGames: GameSessionEntity[];

  @OneToMany(() => FriendShipEntity, (friendship) => friendship.user, {
    eager: true,
  })
  friendships: UserEntity[];

  @OneToMany(() => FriendShipEntity, (friendship) => friendship.friend)
  friendOf: UserEntity[];

  @OneToMany(() => ChatRoomEntity, (chatRoom) => chatRoom.owner)
  chatRooms: ChatRoomEntity[];
}
