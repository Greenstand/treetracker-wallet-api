const knex = require("../database/knex");
const expect = require("expect-runtime");

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
}

module.exports = BaseRepository;
