import { Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Injectable()
export class BaseRepository<Entity> extends Repository<Entity> {
  private readonly logger = new Logger(BaseRepository.name);

  constructor(entity: new () => Entity, dataSource: DataSource) {
    super(entity, dataSource.createEntityManager());
  }

  async getById(id: string): Promise<Entity> {
    const entity = await this.findOne({ where: { id } as any });
    if (!entity) {
      throw new HttpException(
        `Could not find entity by id: ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return entity;
  }

  protected whereBuilder(
    filter: any,
    builder: SelectQueryBuilder<Entity>,
  ): SelectQueryBuilder<Entity> {
    if (filter.and) {
      filter.and.forEach((condition: any) => {
        builder.andWhere(
          new SelectQueryBuilder<Entity>(this.manager.connection),
          (subBuilder) => {
            this.whereBuilder(condition, subBuilder);
            return '';
          },
        );
      });
    } else if (filter.or) {
      filter.or.forEach((condition: any) => {
        builder.orWhere(
          new SelectQueryBuilder<Entity>(this.manager.connection),
          (subBuilder) => {
            this.whereBuilder(condition, subBuilder);
            return '';
          },
        );
      });
    } else {
      Object.keys(filter).forEach((key) => {
        builder.andWhere(`${builder.alias}.${key} = :${key}`, {
          [key]: filter[key],
        });
      });
    }
    return builder;
  }

  // todo: async getByFilter()

  async countByFilter(filter: any): Promise<number> {
    const queryBuilder = this.createQueryBuilder(this.metadata.name);
    this.whereBuilder(filter, queryBuilder);

    const result = await queryBuilder.getCount();
    return result;
  }

  // todo: async update(object)
  // todo: async updateByIds(object, ids)
  // todo: async create(object)
  // todo: async batchCreate(objects)
}
