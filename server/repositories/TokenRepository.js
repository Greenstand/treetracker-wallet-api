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

  async getById(id){
    const result = await this._session.getDB()(this._tableName).where("id", id)
      .first();
    expect(result,() => new HttpError(404, `can not found token by id:${id}`)).match({
      id: expect.any(String),
    });
    return result;
  }

  /*
   * select transaction table by transfer id, return matched tokens
   */
  async getByTransferId(transferId){
    const result = await this._session.getDB().raw(`
      SELECT "token".* FROM "token"
      JOIN "transaction" 
      ON "token".id = "transaction".token_id
      WHERE "transaction".transfer_id = '226f76cd-52b0-486b-b58a-98230696c748'
    `);
    return result;
  }

}

module.exports = TokenRepository;
