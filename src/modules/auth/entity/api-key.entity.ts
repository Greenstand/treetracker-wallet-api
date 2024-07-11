import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'wallet', name: 'api_key' })
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ name: 'tree_token_api_access', type: 'boolean', default: true })
  treeTokenApiAccess: boolean;

  @Column({ nullable: true })
  hash: string;

  @Column({ nullable: true })
  salt: string;

  @Column()
  name: string;
}
