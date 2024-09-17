import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../auth/entity/api-key.entity';
import { Wallet } from '../wallet/entity/wallet.entity';
import * as uuid from 'uuid';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  public apiKey: string;
  public wallet: {
    id: any;
    name: string;
    password: string;
    passwordHash: string;
    salt: string;
  };

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {
    // setup a static apiKey for other tests
    this.apiKey = 'FORTESTFORTESTFORTESTFORTESTFORTEST';
    this.wallet = {
      id: uuid.v4(),
      name: 'walletA',
      password: 'test1234',
      passwordHash:
        '31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1',
      salt: 'TnDe2LDPS7VaPD9GQWL3fhG4jk194nde',
    };
  }

  async seed() {
    const walletB = {
      id: uuid.v4(),
      name: 'walletB',
      password: 'test1234',
      passwordHash:
        '31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1',
      salt: 'TnDe2LDPS7VaPD9GQWL3fhG4jk194nde',
    };

    this.logger.debug('seeding api_key table');
    await this.apiKeyRepository.insert({
      key: this.apiKey,
      treeTokenApiAccess: true,
      hash: 'test',
      salt: 'test',
      name: 'test',
    });

    this.logger.debug('seeding wallet table');
    // wallet
    await this.walletRepository.insert({
      id: this.wallet.id,
      name: this.wallet.name,
      password: this.wallet.passwordHash,
      salt: this.wallet.salt,
    });
    // walletB
    await this.walletRepository.insert({
      id: walletB.id,
      name: walletB.name,
      password: walletB.passwordHash,
      salt: walletB.salt,
    });
  }

  async clear() {
    this.logger.debug('clearing tables');

    // delete all records from wallet and api_key tables
    await this.walletRepository.delete({});
    await this.apiKeyRepository.delete({});
  }
}
