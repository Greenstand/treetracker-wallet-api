import * as knex from 'knex';
import { Injectable } from '@nestjs/common';

import { DB } from 'config/config'; // Шлях до вашого конфігураційного файла Knex

@Injectable()
export class DatabaseService {
  private readonly connection = knex(DB);

  getKnex() {
    return this.connection;
  }
}
