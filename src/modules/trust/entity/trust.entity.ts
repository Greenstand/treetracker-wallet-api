import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ENTITY_TRUST_STATE_TYPE, ENTITY_TRUST_TYPE } from '../trust-enum';

@Entity({ schema: 'wallet', name: 'wallet_trust' })
export class Trust {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  actor_wallet_id: string;

  @Column({ type: 'uuid' })
  target_wallet_id: string;

  @Column({ type: 'enum', enum: ENTITY_TRUST_TYPE })
  type: ENTITY_TRUST_TYPE;

  @Column({ type: 'uuid' })
  originator_wallet_id: string;

  @Column({ type: 'varchar' })
  request_type: string;

  @Column({ type: 'enum', enum: ENTITY_TRUST_STATE_TYPE })
  state: ENTITY_TRUST_STATE_TYPE;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
