const Joi = require('joi');
const HttpError = require('../utils/HttpError');
const BaseRepository = require('./BaseRepository');

class TokenRepository extends BaseRepository {
  constructor(session) {
    super('token', session);
    this._tableName = 'token';
    this._session = session;
  }

  async getById(id) {
    
    Joi.assert(id, Joi.string().uuid());

    const result = await this._session
        .getDB()(this._tableName)
        .where('id', id)
        .first();

    try {
      Joi.assert(result, 
        Joi.object({ id: Joi.string().required() })
          .unknown()
          .required());
    } catch (error) {
        throw new HttpError(404, `can not found token by id:${id}`);
    }

    return result;
  }

  /*
   * select transaction table by transfer id, return matched tokens
   */
  async getByTransferId(transferId, limit, offset = 0) {
    return this._session.getDB().raw(`
      SELECT "token".* FROM "token"
      JOIN "transaction" 
      ON "token".id = "transaction".token_id
      WHERE "transaction".transfer_id = ${transferId}
      LIMIT ${limit}
      OFFSET ${offset}`);
  }
}

module.exports = TokenRepository;
