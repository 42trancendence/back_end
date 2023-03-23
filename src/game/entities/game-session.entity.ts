import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GameEntity } from './game.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity({ name: 'game_sessions' })
export class GameSessionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => GameEntity, (game) => game.gameSessions)
  @JoinColumn({ name: 'game_id' })
  game: GameEntity;

  @ManyToOne(() => UserEntity, (user) => user.wonGames)
  @JoinColumn({ name: 'winner_id' })
  winner: UserEntity;

  @Column({ name: 'start_time' })
  startTime: Date;

  @Column({ name: 'end_time' })
  endTime: Date;

  @Column({ name: 'is_active' })
  isActive: boolean;
}
