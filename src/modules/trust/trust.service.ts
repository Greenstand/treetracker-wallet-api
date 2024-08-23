import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TrustRepository } from './trust.repository';
import { LimitOptions } from '../../common/interfaces/limit-options.interface';
import { Trust } from './entity/trust.entity';
import { DeepPartial } from 'typeorm';

@Injectable()
export class TrustService {
  constructor(
    @InjectRepository(TrustRepository)
    private trustRepository: TrustRepository,
  ) {}

  async getByFilter(
    filter: any,
    limitOptions?: LimitOptions,
  ): Promise<Trust[]> {
    return this.trustRepository.getByFilter(filter, limitOptions);
  }

  async createTrust(trustData: DeepPartial<Trust>): Promise<Trust> {
    return this.trustRepository.createEntity(trustData);
  }
}
