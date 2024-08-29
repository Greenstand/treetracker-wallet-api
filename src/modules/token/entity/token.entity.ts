import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('token')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  capture_id: number;

  @Column()
  wallet_id: string;

  @Column({ default: false })
  transfer_pending: boolean;

  @Column({ nullable: true })
  transfer_pending_id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  claim: boolean;
}
