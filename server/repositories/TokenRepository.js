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
      Joi.assert(
        result,
        Joi.object({ id: Joi.string().required() }).unknown().required(),
      );
    } catch (error) {
      throw new HttpError(404, `Can not find token by id: ${id}`);
    }

    return result;
  }

  /*
   * select transaction table by transfer id, return matched tokens
   */
  async getByTransferId(transferId, limit, offset) {
    // Select only the token columns: token and transaction both have an `id`
    // column, so a bare select('*') lets transaction.id overwrite token.id in
    // the result, returning the transaction id where callers expect the token id.
    return this._session
      .getDB()
      .select('token.*')
      .from('token')
      .join('transaction', 'token.id', 'transaction.token_id')
      .where('transaction.transfer_id', transferId)
      .limit(limit)
      .offset(offset);
  }
}

module.exports = TokenRepository;
