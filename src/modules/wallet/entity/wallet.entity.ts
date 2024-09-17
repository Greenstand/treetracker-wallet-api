import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'wallet' })
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  password: string; // hashed password

  @Column()
  salt: string; // salt used for hashing the password

  @Column({ nullable: true })
  logo_url: string;

  @CreateDateColumn()
  created_at: Date;
}
