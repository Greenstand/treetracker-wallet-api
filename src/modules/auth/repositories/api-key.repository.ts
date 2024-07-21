import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ApiKey } from '../entity/api-key.entity';

@Injectable()
export class ApiKeyRepository extends Repository<ApiKey> {
  constructor(dataSource: DataSource) {
    super(ApiKey, dataSource.createEntityManager());
  }

  async getByApiKey(apiKey: string): Promise<ApiKey | undefined> {
    const result = await this.findOne({ where: { key: apiKey } });
    return result;
  }
}
