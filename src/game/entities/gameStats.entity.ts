import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'gameStats' })
export class GameStatEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    plyerId_1: string;

    @Column()
    plyerImage_1: string

    @Column()
    plyerName_1: string;

    @Column()
    plyer_1_score: number;

    @Column()
    plyer_2_id: string;

    @Column()
    plyerImage_2: string

    @Column()
    plyerName_2: string;

    @Column()
    plyer_2_score: number;

    @Column()
    winnerName: string;

    @Column()
    loserName: string;
    
    @Column({ type: 'timestamp', default: () => 'CURRNET_TIMESTAMP' })
    date: Date;
}
