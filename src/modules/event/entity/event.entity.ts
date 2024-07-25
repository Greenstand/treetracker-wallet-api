import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
// @Entity({ schema: 'wallet', name: 'wallet_event' })
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  wallet_id: string;

  @Column()
  type: string;

  @Column('json')
  payload: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
