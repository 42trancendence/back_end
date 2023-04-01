import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { GameSessionEntity } from './gameSession.entity';
import { ChatRoomEntity } from 'src/chat-room/entities/chatRoom.entity';

@Entity({ name: 'gameRooms' })
export class GameRoomsEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    maxPlayer: number;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'owner_id' })
    owner: UserEntity;

    // 방 하나에 하나의 세션만 존재
    @OneToOne(() => GameSessionEntity, (gameSession) => gameSession.id)
    gameSession: GameSessionEntity;

    // @OneToMany(() => ChatRoomEntity, (chatRoom) => chatRoom.gameRoom)
    // chatRooms: ChatRoomEntity[];
}