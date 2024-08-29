import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Transfer } from './entity/transfer.entity';

@Injectable()
export class TransferRepository extends BaseRepository<Transfer> {
  constructor(dataSource: DataSource) {
    super(Transfer, dataSource);
  }
}
