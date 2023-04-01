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

@Entity({ name: 'gameStats' })
export class GameStatEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: string;

    @Column()
    total_game: number;

    @Column()
    total_win: number;

    @Column()
    total_lose: number;

    @Column()
    win_rate: number;
}
