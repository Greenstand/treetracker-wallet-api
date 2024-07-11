import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ApiKey } from '../entity/api-key.entity';

@Injectable()
export class ApiKeyRepository extends Repository<ApiKey> {
  private readonly logger = new Logger(ApiKeyRepository.name);

  constructor(dataSource: DataSource) {
    super(ApiKey, dataSource.createEntityManager());
  }

  async getByApiKey(apiKey: string): Promise<ApiKey | undefined> {
    const result = await this.findOne({ where: { key: apiKey } });

    if (!result) {
      this.logger.error(`API key not found: ${apiKey}`);
    }

    return result;
  }
}
