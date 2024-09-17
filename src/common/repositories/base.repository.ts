import {
  Repository,
  SelectQueryBuilder,
  DataSource,
  DeepPartial,
} from 'typeorm';
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { LimitOptions } from '../interfaces/limit-options.interface';
import * as Joi from 'joi';

interface BaseEntity {
  id: string;
  // add other common properties if needed
}

@Injectable()
export class BaseRepository<
  Entity extends BaseEntity,
> extends Repository<Entity> {
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

  /*
   * Select by filter
   * Support: and / or
   * Options: limit, offset, order, sort_by
   */
  async getByFilter(
    filter: any,
    limitOptions?: LimitOptions,
  ): Promise<Entity[]> {
    let queryBuilder = this.createQueryBuilder('entity').where(
      (qb: SelectQueryBuilder<Entity>) => {
        this.whereBuilder(filter, qb);
      },
    );

    let order: 'ASC' | 'DESC' = 'DESC';
    let column = 'entity.created_at'; // default sorting by creation date

    if (limitOptions) {
      if (limitOptions.order) {
        order = limitOptions.order.toUpperCase() as 'ASC' | 'DESC';
      }

      if (limitOptions.sort_by) {
        column = `entity.${limitOptions.sort_by}`;
      }

      if (limitOptions.limit) {
        queryBuilder = queryBuilder.limit(limitOptions.limit);
      }

      if (limitOptions.offset) {
        queryBuilder = queryBuilder.offset(limitOptions.offset);
      }
    }

    queryBuilder = queryBuilder.orderBy(column, order);

    return await queryBuilder.getMany();
  }

  async countByFilter(filter: any): Promise<number> {
    const queryBuilder = this.createQueryBuilder(this.metadata.name);
    this.whereBuilder(filter, queryBuilder);

    const result = await queryBuilder.getCount();
    return result;
  }

  /*
   * Update a row matching the given object's id
   */
  async updateEntity(object: Partial<Entity>): Promise<Entity | null> {
    // Create a copy of the object and extract the `id` to use in the WHERE clause
    const { id, ...objectCopy } = object;

    if (!id) {
      throw new Error('ID is required for updating an entity.');
    }

    // Perform the update operation using QueryBuilder
    const result = await this.createQueryBuilder()
      .update(this.metadata.target)
      .set(objectCopy)
      .where('id = :id', { id })
      .returning('*') // PostgreSQL-specific: Return the updated row(s)
      .execute();

    // Return the first updated record, or null if nothing was updated
    return result.raw[0] || null;
  }

  /*
   * Update all rows matching given ids
   */
  async updateByIds(object: Partial<Entity>, ids: string[]): Promise<number> {
    // Create a copy of the object and remove the `id` property to prevent updating it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...objectCopy } = object;

    // Perform the update operation using QueryBuilder
    const result = await this.createQueryBuilder()
      .update(this.metadata.target)
      .set(objectCopy)
      .whereInIds(ids)
      .execute();

    // Return the number of affected rows
    return result.affected || 0;
  }

  async createEntity(object: DeepPartial<Entity>): Promise<Entity> {
    const entity = this.create(object);
    const savedEntity = await this.save(entity);
    return savedEntity;
  }

  /*
   * Return ids created
   */
  async batchCreate(objects: Partial<Entity>[]): Promise<string[]> {
    // Log the batch of objects being inserted
    this.logger.debug('Object batch:', objects);

    // Insert the batch of objects and get the result
    const result = await this.createQueryBuilder()
      .insert()
      .into(this.metadata.tableName)
      .values(objects)
      .returning('id')
      .execute();

    // Extract the IDs from the result
    const ids = result.raw.map((record: { id: string }) => record.id);

    // Validate the result with Joi
    Joi.assert(ids, Joi.array().items(Joi.string()));

    // Return the IDs
    return ids;
  }
}
