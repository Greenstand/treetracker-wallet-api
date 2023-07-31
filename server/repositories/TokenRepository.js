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

    if (!result) {
      throw new HttpError(404, `can not found token by id:${id}`);
    }

    return result;
  }

  /*
   * select transaction table by transfer id, return matched tokens
   */
  async getByTransferId(transferId, limit, offset = 0) {
    return this._session
      .getDB()
      .select('*')
      .from('token')
      .join('transaction', 'token.id', 'transaction.token_id')
      .where('transaction.transfer_id', transferId)
      .limit(limit)
      .offset(offset);
  }
}

module.exports = TokenRepository;
