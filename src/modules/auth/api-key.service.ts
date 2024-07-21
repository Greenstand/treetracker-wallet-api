import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class ApiKeyService {
  private apiKeyRepository: ApiKeyRepository;

  constructor(dataSource: DataSource) {
    this.apiKeyRepository = new ApiKeyRepository(dataSource);
  }

  async check(apiKey: string) {
    if (!apiKey) {
      throw new UnauthorizedException('Invalid access - no API key');
    }

    const result = await this.apiKeyRepository.getByApiKey(apiKey);
    if (!result) throw new UnauthorizedException('Invalid API access');
    if (result.treeTokenApiAccess === false) {
      throw new UnauthorizedException(
        'Invalid API access, apiKey was deprecated',
      );
    }

    // todo: add url back to apiKeyService.check()
    // if (url.includes('batch-create-wallet')) {
    //   throw new UnauthorizedException(
    //     'Invalid API access, no permission to access this endpoint',
    //   );
    // }
  }
}
