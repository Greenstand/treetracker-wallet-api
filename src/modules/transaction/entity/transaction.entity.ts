import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from '../../wallet/entity/wallet.entity';
import { Transfer } from '../../transfer/entity/transfer.entity';
import { Token } from '../../token/entity/token.entity';

@Entity('transaction')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  token_id: string;

  @ManyToOne(() => Token)
  @JoinColumn({ name: 'token_id' })
  token: Token;

  @Column({ type: 'uuid', nullable: false })
  transfer_id: string;

  @ManyToOne(() => Transfer)
  @JoinColumn({ name: 'transfer_id' })
  transfer: Transfer;

  @Column({ type: 'uuid', nullable: false })
  source_wallet_id: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'source_wallet_id' })
  sourceWallet: Wallet;

  @Column({ type: 'uuid', nullable: false })
  destination_wallet_id: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'destination_wallet_id' })
  destinationWallet: Wallet;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;

  @Column({ type: 'boolean', default: false })
  claim: boolean;
}
