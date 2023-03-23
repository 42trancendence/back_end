import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { GameSessionEntity } from './game-session.entity';

@Entity({ name: 'games' })
export class GameEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ name: 'cover_image_url' })
  coverImageUrl: string;

  @OneToMany(() => GameSessionEntity, (gameSession) => gameSession.game)
  gameSessions: GameSessionEntity[];
}
