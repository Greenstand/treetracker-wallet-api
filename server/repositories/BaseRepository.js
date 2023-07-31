const Joi = require('joi');
const log = require('loglevel');
const HttpError = require('../utils/HttpError');

class BaseRepository {
  constructor(tableName, session) {
    Joi.assert(tableName, Joi.required());
    this._tableName = tableName;
    this._session = session;
  }

  async getById(id) {
    const object = await this._session
      .getDB()
      .select()
      .table(this._tableName)
      .where('id', id)
      .first();
    if (!object) {
      throw new HttpError(404, `Can not found ${this._tableName} by id:${id}`);
    }
    return object;
  }

  whereBuilder(object, builder) {
    let result = builder;
    if (object.and) {
      Joi.assert(object, Joi.object().length(1));
      Joi.assert(object.and, Joi.array().required());
      object.and.forEach((one) => {
        if (!one.or) {
          Joi.assert(one, Joi.object().length(1));
        }
        result = result.andWhere((subBuilder) =>
          this.whereBuilder(one, subBuilder),
        );
      });
    } else if (object.or) {
      Joi.assert(object, Joi.object().length(1));
      Joi.assert(object.or, Joi.array().required());

      object.or.forEach((one) => {
        if (!one.and) {
          Joi.assert(one, Joi.object().length(1));
        }
        result = result.orWhere((subBuilder) =>
          this.whereBuilder(one, subBuilder),
        );
      });
    } else {
      const filterObjectCopy = { ...object };
      const beforeFilter = object.before;
      if (object.before) {
        result.whereRaw(`cast(${Object.keys(beforeFilter)[0]} as date) <= ?`, [
          Object.values(beforeFilter)[0],
        ]);
        delete filterObjectCopy.before;
      }
      const afterFilter = object.after;
      if (object.after) {
        result.where(
          Object.keys(afterFilter)[0],
          '>=',
          Object.values(afterFilter)[0],
        );
        delete filterObjectCopy.after;
      }
      result.where(filterObjectCopy);
    }
    return result;
  }

  /*
   * select by filter
   * support: and / or
   * options:
   *  limit: number
   */
  async getByFilter(filter, options) {
    const offset = options && options.offset ? options.offset : 0;
    let promise = this._session
      .getDB()
      .select()
      .table(this._tableName)
      .offset(offset)
      .where((builder) => this.whereBuilder(filter, builder));

    if (options && options.limit) {
      promise = promise.limit(options.limit);
    }
    const result = await promise;
    Joi.assert(result, Joi.array().required());
    return result;
  }

  async countByFilter(filter) {
    const result = await this._session
      .getDB()
      .count()
      .table(this._tableName)
      .where(filter);
    // expect(result).match([
    //   {
    //     count: expect.any(String),
    //   },
    // ]);

    Joi.assert(
      result,
      Joi.array().items(
        Joi.object({
          count: Joi.string().required(),
        }),
      ),
    );

    return parseInt(result[0].count);
  }

  async update(object) {
    const objectCopy = {};
    Object.assign(objectCopy, object);
    const { id } = object;
    delete objectCopy.id;
    const result = await this._session
      .getDB()(this._tableName)
      .update(objectCopy)
      .where('id', id)
      .returning('*');
    return result[0];
  }

  /*
   * update all rows matching given id
   */
  async updateByIds(object, ids) {
    const objectCopy = {};
    Object.assign(objectCopy, object);
    delete objectCopy.id;
    const result = await this._session
      .getDB()(this._tableName)
      .update(objectCopy)
      .whereIn('id', ids);
    return result;
  }

  async create(object) {
    const result = await this._session
      .getDB()(this._tableName)
      .insert(object)
      .returning('*');
    return result[0];
  }

  /*
   * return ids created
   */
  async batchCreate(objects) {
    log.debug('object batch:', objects);
    const result = await this._session
      .getDB()
      .batchInsert(this._tableName, objects)
      .returning('id');
    // expect(result).match([expect.any(String)]);
    Joi.assert(result, Joi.array().items(Joi.string()));
    return result;
  }
}

module.exports = BaseRepository;
