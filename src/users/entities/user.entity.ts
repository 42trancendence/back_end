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

  @Column({ default: true })
  isVerified: boolean;

  @ApiProperty({ description: '유저 상태' })
  @Column({ default: Status.OFFLINE })
  status: Status;

  @ApiProperty({ description: '유저 랭킹 점수' })
  @Exclude()
  @Column({ default: 1000 })
  rating: number;

  @OneToMany(() => GameStatsEntity, (game) => game.player1)
  gameStatsAsPlayer1: GameStatsEntity[];

  @OneToMany(() => GameStatsEntity, (game) => game.player2)
  gameStatsAsPlayer2: GameStatsEntity[];

  get gameStats(): GameStatsEntity[] {
    return [...this.gameStatsAsPlayer1, ...this.gameStatsAsPlayer2];
  }

  // @OneToMany(() => FriendShipEntity, (friendship) => friendship.user)
  // friendships: FriendShipEntity[];
  //
  // @OneToMany(() => FriendShipEntity, (friendship) => friendship.friend)
  // friendOf: FriendShipEntity[];
}
