import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Status } from '../enum/status.enum';
import { GameStatsEntity } from 'src/game/entities/gameStats.entity';

@Entity('User')
export class UserEntity {
  @ApiProperty({ description: '유저 ID' })
  @PrimaryColumn()
  id: string;

  @ApiProperty({ description: '유저 이름' })
  @Column({ length: 30 })
  name: string;

  @ApiProperty({ description: '유저 이메일' })
  @Column({ length: 60, nullable: true })
  email: string;

  @Exclude()
  @Column({ length: 60, nullable: true })
  twoFactorAuthCode: string;

  @ApiProperty({ description: '유저 아바타 URL' })
  @Column({ name: 'avatar_image_url' })
  avatarImageUrl: string;

  @ApiProperty({ description: '유저 가입 날짜' })
  @Column({ name: 'registration_date' })
  registrationDate: Date;

  @Exclude()
  @Column()
  isVerified: boolean;

  @ApiProperty({ description: '유저 상태' })
  @Column({ default: Status.OFFLINE })
  status: Status;

  @OneToMany(() => GameStatsEntity, (game) => game.roomId)
  gameStats: GameStatsEntity[];

  // @OneToMany(() => FriendShipEntity, (friendship) => friendship.user)
  // friendships: FriendShipEntity[];
  //
  // @OneToMany(() => FriendShipEntity, (friendship) => friendship.friend)
  // friendOf: FriendShipEntity[];
}
