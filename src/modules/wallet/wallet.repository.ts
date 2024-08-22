import { DataSource } from 'typeorm';
import { Wallet } from './entity/wallet.entity';
import { Injectable, Logger } from '@nestjs/common';
import {
  ENTITY_TRUST_REQUEST_TYPE,
  ENTITY_TRUST_STATE_TYPE,
} from '../trust/trust-enum';
import { LimitOptions } from '../../common/interfaces/limit-options.interface';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class WalletRepository extends BaseRepository<Wallet> {
  private readonly logger = new Logger(WalletRepository.name);

  constructor(dataSource: DataSource) {
    super(Wallet, dataSource);
  }

  async getById(id: string): Promise<Wallet> {
    return await super.getById(id);
  }

  async getByName(name: string): Promise<Wallet> {
    const wallet = await this.findOne({ where: { name } });
    if (!wallet) {
      throw new Error(`Could not find entity by wallet name: ${name}`);
    }
    return wallet;
  }

  /*
  Get a wallet itself including its sub wallets
  */
  async getAllWallets(
    id: string,
    limitOptions: LimitOptions,
    name: string,
    sort_by: string,
    order: string,
    created_at_start_date?: Date,
    created_at_end_date?: Date,
    getCount = false,
  ): Promise<{ wallets: Wallet[]; count: number }> {
    let query = this.createQueryBuilder('wallet')
      .select([
        'wallet.id',
        'wallet.name',
        'wallet.logo_url',
        'wallet.created_at',
      ])
      .where('wallet.id = :id', { id });

    const union1 = this.createQueryBuilder('wallet')
      .select([
        'wallet.id',
        'wallet.name',
        'wallet.logo_url',
        'wallet.created_at',
      ])
      .innerJoin(
        'wallet_trust',
        'wallet_trust',
        'wallet_trust.target_wallet_id = wallet.id',
      )
      .where('wallet_trust.actor_wallet_id = :id', { id })
      .andWhere('wallet_trust.request_type = :manage', {
        manage: ENTITY_TRUST_REQUEST_TYPE.manage,
      })
      .andWhere('wallet_trust.state = :trusted', {
        trusted: ENTITY_TRUST_STATE_TYPE.trusted,
      });

    const union2 = this.createQueryBuilder('wallet')
      .select([
        'wallet.id',
        'wallet.name',
        'wallet.logo_url',
        'wallet.created_at',
      ])
      .innerJoin(
        'wallet_trust',
        'wallet_trust',
        'wallet_trust.actor_wallet_id = wallet.id',
      )
      .where('wallet_trust.target_wallet_id = :id', { id })
      .andWhere('wallet_trust.request_type = :yield', {
        yield: ENTITY_TRUST_REQUEST_TYPE.yield,
      })
      .andWhere('wallet_trust.state = :trusted', {
        trusted: ENTITY_TRUST_STATE_TYPE.trusted,
      });

    if (name) {
      union1.andWhere('wallet.name ILIKE :name', { name: `%${name}%` });
      union2.andWhere('wallet.name ILIKE :name', { name: `%${name}%` });
    }

    const unionQuery = `${union1.getQuery()} UNION ${union2.getQuery()} ORDER BY ${sort_by} ${order}`;

    query = this.createQueryBuilder('wallet')
      .select('*')
      .from(`(${unionQuery})`, 't');

    if (created_at_start_date) {
      query = query.andWhere('cast(t.created_at as date) >= :start_date', {
        start_date: created_at_start_date,
      });
    }

    if (created_at_end_date) {
      query = query.andWhere('cast(t.created_at as date) <= :end_date', {
        end_date: created_at_end_date,
      });
    }

    const countQuery = query.clone().select('COUNT(*)', 'count');

    if (limitOptions?.limit) {
      query = query.limit(limitOptions.limit);
    }

    if (limitOptions?.offset) {
      query = query.offset(limitOptions.offset);
    }

    const wallets = (await query.getRawMany()) || [];
    const count = getCount ? +(await countQuery.getRawOne())?.count || 0 : 0;

    return { wallets, count };
  }
}
