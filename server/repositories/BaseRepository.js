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

  async getByFilter(filter){
    const result = await knex.select().table(this._tableName).where(filter);
    return result;
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
