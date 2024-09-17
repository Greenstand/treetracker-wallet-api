import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { EVENT_TYPES } from '../event-enum';

@Entity({ schema: 'wallet', name: 'wallet_event' })
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  wallet_id: string;

  @Column({
    type: 'enum',
    enum: EVENT_TYPES,
  })
  type: EVENT_TYPES;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
