const Session = require("../models/Session");
const expect = require("expect-runtime");
const HttpError = require("../utils/HttpError");
const log = require("loglevel");

class BaseRepository{

  constructor(tableName, session){
    expect(tableName).defined();
    this._tableName = tableName;
    this._session = session;
  }

  async getById(id){
    const object = await this._session.getDB().select().table(this._tableName).where('id', id).first();
    if(!object){
      throw new HttpError(404, `Can not found ${this._tableName} by id:${id}`);
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
    let promise = this._session.getDB().select().table(this._tableName).where(builder => whereBuilder(filter, builder));
    if(options && options.limit){
      promise = promise.limit(options && options.limit);
    }
    const result = await promise;
    expect(result).a(expect.any(Array));
    return result;
  }

  async countByFilter(filter){
    const result = await this._session.getDB().count().table(this._tableName).where(filter);
    expect(result).match([{
      count: expect.any(String),
    }]);
    return parseInt(result[0].count);
  }

  async update(object){
    let objectCopy = {}
    Object.assign(objectCopy, object)
    const id = object.id
    delete objectCopy.id
    const result = await this._session.getDB()(this._tableName).update(objectCopy).where("id", id).returning("*");
    return result[0];
  }

  /*
   * update all rows matching given id
   */
  async updateByIds(object, ids){
    let objectCopy = {}
    Object.assign(objectCopy, object)
    delete objectCopy.id
    const result = await this._session.getDB()(this._tableName).update(objectCopy).whereIn("id", ids);
  }

  async create(object){
    const result = await this._session.getDB()(this._tableName).insert(object).returning("*");
    expect(result).match([{
      id: expect.anything(),
    }]);
    return result[0];
  }

  /*
   * return ids created
   */
  async batchCreate(objects){
    log.warn("object batch:", objects);
    const result = await this._session.getDB().batchInsert(this._tableName,objects).returning('id');
    expect(result).match([expect.any(String)]);
    return result;
  }

}

module.exports = BaseRepository;
