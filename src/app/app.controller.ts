import { Controller, Get } from '@nestjs/common';
import { InjectKnex, Knex } from 'nestjs-knex';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectKnex() private readonly knex: Knex,
  ) {}

  @Get()
  async getHello() {
    console.log(this.knex('wallet.wallet'));

    return await this.knex('wallet.wallet');
  }
}
