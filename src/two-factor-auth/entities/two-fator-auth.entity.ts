import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('TwoFactorEntity')
export class TwoFactorEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  code: string;

  @Column()
  date: Date;
}
