import { UserEntity } from 'src/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity({ name: 'gameStats' })
export class GameStatsEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  roomId: string;

  @ManyToOne(() => UserEntity, (user) => user.gameStats, { eager: true })
  player1: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.gameStats, { eager: true })
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
