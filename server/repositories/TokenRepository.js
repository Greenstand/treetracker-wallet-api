const Joi = require('joi');
const HttpError = require('../utils/HttpError');
const BaseRepository = require('./BaseRepository');

class TokenRepository extends BaseRepository {
  constructor(session) {
    super('token', session);
    this._tableName = 'token';
    this._session = session;
  }

  /*
   * Claim tokens for a share link. The transfer_pending = false condition
   * makes this atomic: two concurrent link creations cannot both take the
   * same row, and the caller compares the count to what it asked for.
   */
  async reserveForActionToken(tokenIds, actionTokenId) {
    const updated = await this._session
      .getDB()
      .table('token')
      .whereIn('id', tokenIds)
      .andWhere({ transfer_pending: false })
      .update({ transfer_pending: true, action_token_id: actionTokenId }, [
        'id',
      ]);
    return updated.length;
  }

  /*
   * Give a link's tokens back. Scoped to action_token_id, so a normal
   * transfer's reservation can never be released by accident.
   */
  async releaseActionTokenReservation(actionTokenId) {
    const released = await this._session
      .getDB()
      .table('token')
      .where({ action_token_id: actionTokenId })
      .update({ transfer_pending: false, action_token_id: null }, ['id']);
    return released.length;
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
    // token.* only: token and transaction both have an `id` column, and an
    // unqualified select('*') let transaction.id clobber the real token id.
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
