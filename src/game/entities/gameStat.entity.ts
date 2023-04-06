import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'gameStat' })
export class GameStatEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    plyerId_1: string;

    @Column()
    plyer_1_score: number;

    @Column()
    plyer_2_id: string;

    @Column()
    plyer_2_score: number;

    @Column()
    winnerName: string;

    @Column()
    loserName: string;
    
    // 요놈 에러 난다 나중에 고치자
    // @Column({ type: 'timestamp', default: () => 'CURRNET_TIMESTAMP' })
    // date: Date;
}
