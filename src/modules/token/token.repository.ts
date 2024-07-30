import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Token } from './entity/token.entity';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class TokenRepository extends BaseRepository<Token> {
  constructor(dataSource: DataSource) {
    super(Token, dataSource);
  }
}
