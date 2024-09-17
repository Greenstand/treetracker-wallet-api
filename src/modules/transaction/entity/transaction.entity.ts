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

  @ManyToOne(() => Token)
  @JoinColumn({ name: 'token_id' })
  token: Token;

  @ManyToOne(() => Transfer)
  @JoinColumn({ name: 'transfer_id' })
  transfer: Transfer;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'source_wallet_id' })
  sourceWallet: Wallet;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'destination_wallet_id' })
  destinationWallet: Wallet;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;

  @Column({ type: 'boolean', default: false })
  claim: boolean;
}
