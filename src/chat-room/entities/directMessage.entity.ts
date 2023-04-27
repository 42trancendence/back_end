import { UserEntity } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MessageEntity } from './message.entity';

@Entity({ name: 'directMessage' })
export class DirectMessageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.id, { eager: true })
  user1: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.id, { eager: true })
  user2: UserEntity;

  @OneToMany(() => MessageEntity, (message) => message.directMessage)
  messages: MessageEntity[];

  @Column({ default: false })
  isBlockedByUser1: boolean;

  @Column({ default: false })
  isBlockedByUser2: boolean;
}