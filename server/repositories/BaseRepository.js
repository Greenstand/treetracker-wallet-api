const knex = require("../database/knex");
const expect = require("expect-runtime");
const HttpError = require("../utils/HttpError");

class BaseRepository{

  constructor(tableName){
    expect(tableName).defined();
    this._tableName = tableName;
  }

  async getById(id){
    const object = await knex.select().table(this._tableName).where('id', id).first();
    if(!object){
      throw new HttpError(404, `Can not found ${this._tableName} by id`);
    }
    return object;
  }

  /*
   * select by filter
   * options:
   *  limit: number
   */
  async getByFilter(filter, options){
    let result;
    //TODO better way to support options
    if(options && options.limit){
      result = await knex.select().table(this._tableName).where(filter).limit(options && options.limit);
    }else{
      result = await knex.select().table(this._tableName).where(filter);
    }
    return result;
  }

  async countByFilter(filter){
    const result = await knex.count().table(this._tableName).where(filter);
    expect(result).match([{
      count: expect.any(String),
    }]);
    return parseInt(result[0].count);
  }

  async update(object){
    return await knex(this._tableName).update(object).where("id", object.id).returning("*");
  }

  async create(object){
    const result = await knex(this._tableName).insert(object).returning("*");
    expect(result).match([{
      id: expect.anything(),
    }]);
    return result[0];
  }

}

module.exports = BaseRepository;
