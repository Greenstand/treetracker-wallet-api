import { Wallet } from '../../wallet/entity/wallet.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TRANSFER_STATES } from '../transfer-enums';

@Entity({ schema: 'wallet', name: 'transfer' })
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wallet)
  originator_wallet_id: string;

  @ManyToOne(() => Wallet)
  source_wallet_id: string;

  @ManyToOne(() => Wallet)
  destination_wallet_id: string;

  @Column({ type: 'enum', enum: TRANSFER_STATES })
  state: TRANSFER_STATES;

  @Column('jsonb', { nullable: true })
  parameters: any;

  @Column({ default: false })
  claim: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;
}
