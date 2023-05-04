import { UserEntity } from 'src/users/entities/user.entity';
import { Entity, Column, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';

@Entity({ name: 'gameStats' })
export class GameStatsEntity {
  @PrimaryColumn()
  roomId: string;

  @Column()
  title: string;

  @ManyToOne(() => UserEntity, (user) => user.gameStatsAsPlayer1)
  // @JoinColumn({ name: 'userId' })
  player1: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.gameStatsAsPlayer2)
  // @JoinColumn({ name: 'userId' })
  player2: UserEntity;

  @Column()
  player1Score: number;

  @Column()
  player2Score: number;

  @Column()
  winnerName: string;

  @Column()
  loserName: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createAt: Date;

  @Column()
  status: string;
}
