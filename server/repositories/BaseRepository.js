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
   * support: and / or
   * options:
   *  limit: number
   */
  async getByFilter(filter, options){
    const whereBuilder = function(object, builder){
      let result = builder;
      if(object['and']){
        expect(Object.keys(object)).lengthOf(1);
        expect(object['and']).a(expect.any(Array));
        for(let one of object['and']){
          if(one['or']){
            result = result.andWhere(subBuilder => whereBuilder(one, subBuilder));
          }else{
            expect(Object.keys(one)).lengthOf(1);
            result = result.andWhere(Object.keys(one)[0], Object.values(one)[0]);
          }
        }
      }else if(object['or']){
        expect(Object.keys(object)).lengthOf(1);
        expect(object['or']).a(expect.any(Array));
        for(let one of object['or']){
          if(one['and']){
            result = result.orWhere(subBuilder => whereBuilder(one, subBuilder));
          }else{
            expect(Object.keys(one)).lengthOf(1);
            result = result.orWhere(Object.keys(one)[0], Object.values(one)[0]);
          }
        }
      }else{
        result.where(object);
      }
      return result;
    }
    let promise = knex.select().table(this._tableName).where(builder => whereBuilder(filter, builder));
    if(options && options.limit){
      promise = promise.limit(options && options.limit);
    }
    const result = await promise;
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
