import { DataSource, Repository } from 'typeorm';
import { Wallet } from './entity/wallet.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletRepository extends Repository<Wallet> {
  constructor(dataSource: DataSource) {
    super(Wallet, dataSource.createEntityManager());
  }

  async getByName(name: string): Promise<Wallet> {
    const wallet = await this.findOne({ where: { name } });
    if (!wallet) {
      throw new Error(`Could not find entity by wallet name: ${name}`);
    }
    return wallet;
  }
}
