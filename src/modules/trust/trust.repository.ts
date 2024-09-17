import { DataSource } from 'typeorm';
import { Trust } from './entity/trust.entity';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class TrustRepository extends BaseRepository<Trust> {
  constructor(dataSource: DataSource) {
    super(Trust, dataSource);
  }

  // async getByFilter(
  //   filter: any,
  //   limitOptions?: LimitOptions,
  // ): Promise<Trust[]> {
  //   let queryBuilder = this.createQueryBuilder('trust')
  //     .leftJoinAndSelect('trust.originator_wallet', 'originator_wallet')
  //     .leftJoinAndSelect('trust.actor_wallet', 'actor_wallet')
  //     .leftJoinAndSelect('trust.target_wallet', 'target_wallet')
  //     .where((qb) => {
  //       this.whereBuilder(filter, qb);
  //     });

  //   let order = 'DESC';
  //   let column = 'trust.created_at';

  //   if (limitOptions) {
  //     if (limitOptions.order) {
  //       order = limitOptions.order.toUpperCase();
  //     }

  //     if (limitOptions.sort_by) {
  //       column = `trust.${limitOptions.sort_by}`;
  //     }

  //     if (limitOptions.limit) {
  //       queryBuilder = queryBuilder.limit(limitOptions.limit);
  //     }

  //     if (limitOptions.offset) {
  //       queryBuilder = queryBuilder.offset(limitOptions.offset);
  //     }
  //   }

  //   queryBuilder = queryBuilder.orderBy(column, order as 'ASC' | 'DESC');

  //   return await queryBuilder.getMany();
  // }
}
