const expect = require('expect-runtime');
const log = require('loglevel');
const HttpError = require('../utils/HttpError');

class BaseRepository {
  constructor(tableName, session) {
    expect(tableName).defined();
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
      expect(Object.keys(object)).lengthOf(1);
      expect(object.and).a(expect.any(Array));
      object.and.forEach((one) => {
        if (one.or) {
          result = result.andWhere((subBuilder) =>
            this.whereBuilder(one, subBuilder),
          );
        } else {
          expect(Object.keys(one)).lengthOf(1);
          result = result.andWhere(Object.keys(one)[0], Object.values(one)[0]);
        }
      });
    } else if (object.or) {
      expect(Object.keys(object)).lengthOf(1);
      expect(object.or).a(expect.any(Array));
      object.or.forEach((one) => {
        if (one.and) {
          result = result.orWhere((subBuilder) =>
            this.whereBuilder(one, subBuilder),
          );
        } else {
          expect(Object.keys(one)).lengthOf(1);
          result = result.orWhere(Object.keys(one)[0], Object.values(one)[0]);
        }
      });
    } else {
      result.where(object);
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
    expect(result).a(expect.any(Array));
    return result;
  }

  async countByFilter(filter) {
    const result = await this._session
      .getDB()
      .count()
      .table(this._tableName)
      .where(filter);
    expect(result).match([
      {
        count: expect.any(String),
      },
    ]);
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
    expect(result).match([expect.any(String)]);
    return result;
  }
}

module.exports = BaseRepository;
