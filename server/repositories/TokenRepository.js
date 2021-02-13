const knex = require('../database/knex');
const config = require('../../config/config');
const HttpError = require("../utils/HttpError");
const BaseRepository = require("./BaseRepository");
const expect = require("expect-runtime");
const Session = require("../models/Session");

class TokenRepository extends BaseRepository{
  constructor(session){
    super("token", session);
    this._tableName = "token";
    this._session = session;
  }

  async getByUUID(uuid){
    const result = await this._session.getDB()(this._tableName).where("uuid", uuid)
      .first();
    expect(result,() => new HttpError(404, `can not found token by uuid:${uuid}`)).match({
      id: expect.any(Number),
    });
    return result;
  }

}

module.exports = TokenRepository;
