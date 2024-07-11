import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ schema: 'wallet', name: 'wallet' })
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  password: string; // hashed password

  @Column()
  salt: string; // salt used for hashing the password

  @CreateDateColumn()
  created_at: Date;
}
