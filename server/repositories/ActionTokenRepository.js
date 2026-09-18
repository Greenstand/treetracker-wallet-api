const BaseRepository = require('./BaseRepository');

// Persisted record of an issued action token (share link). Redemption stays
// stateless (JWT), but the row gives visibility + revocation for issue #846.
class ActionTokenRepository extends BaseRepository {
  constructor(session) {
    super('action_token', session);
  }

  // List the links issued from any of the given sender wallets, newest first,
  // with the total count before limit/offset.
  async getBySenders(senderWalletIds, { state, limit, offset } = {}) {
    let query = this._session
      .getDB()
      .select()
      .table(this._tableName)
      .whereIn('sender_wallet_id', senderWalletIds);
    if (state) {
      query = query.where('state', state);
    }
    query = query.orderBy('created_at', 'desc');

    const count = await this._session
      .getDB()
      .from(query.clone().as('p'))
      .count('*');

    if (offset) query = query.offset(offset);
    if (limit) query = query.limit(limit);

    const result = await query;
    return { result, count: +count[0].count };
  }
}

module.exports = ActionTokenRepository;
