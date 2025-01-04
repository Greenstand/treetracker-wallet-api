import { Wallet } from '../../wallet/entity/wallet.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TRANSFER_STATES, TRANSFER_TYPES } from '../transfer-enums';

@Entity({ name: 'transfer' })
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'originator_wallet_id' })
  originatorWalletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'originator_wallet_id' })
  originatorWallet: Wallet;

  @Column({ name: 'source_wallet_id' })
  sourceWalletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'source_wallet_id' })
  sourceWallet: Wallet;

  @Column({ name: 'destination_wallet_id' })
  destinationWalletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'destination_wallet_id' })
  destinationWallet: Wallet;

  @Column({ type: 'enum', enum: TRANSFER_STATES })
  state: TRANSFER_STATES;

  @Column({ type: 'enum', enum: TRANSFER_TYPES })
  type: TRANSFER_TYPES;

  @Column('jsonb', { nullable: true })
  parameters: any;

  @Column({ default: false })
  claim: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;
}
