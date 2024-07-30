import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'wallet', name: 'wallet_trust' })
export class Trust {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  actor_wallet_id: string;

  @Column({ type: 'uuid' })
  target_wallet_id: string;

  @Column({ type: 'uuid' })
  originator_wallet_id: string;

  @Column({ type: 'varchar' })
  request_type: string;

  @Column({ type: 'varchar' })
  state: string;

  @Column({ type: 'varchar' })
  type: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
