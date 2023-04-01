import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { ChatRoomEntity } from 'src/chat-room/entities/chatRoom.entity';

@Entity({ name: 'gameSession' })
export class GameSessionEntity {
    @PrimaryGeneratedColumn()
    id: number;

    // User 엔티티와 1:N 관계를 맺는다.
    @Column()
    winner_id: string;

    // User 엔티티와 1:N 관계를 맺는다.
    @Column()
    loser_id: string;

    @Column()
    winner_score: number;

    @Column()
    loser_score: number;

    @Column()
    start_time: Date;

    @Column()
    end_time: Date;
}
