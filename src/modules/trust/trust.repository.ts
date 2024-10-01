import { DataSource } from 'typeorm';
import { Trust } from './entity/trust.entity';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class TrustRepository extends BaseRepository<Trust> {
  constructor(dataSource: DataSource) {
    super(Trust, dataSource);
  }
}
