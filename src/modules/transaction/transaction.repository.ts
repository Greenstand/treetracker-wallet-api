import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Transaction } from '../transaction/entity/transaction.entity';

@Injectable()
export class TransactionRepository extends BaseRepository<Transaction> {
  constructor(dataSource: DataSource) {
    super(Transaction, dataSource);
  }
}
