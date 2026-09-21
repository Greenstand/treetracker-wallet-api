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

  /*
   * Flip every overdue active link to expired and return their ids, so the
   * caller can hand their tokens back. Global rather than per wallet: any
   * link activity by anyone releases everyone's expired links, which is why
   * no cron job is needed.
   */
  async expireOverdue() {
    const rows = await this._session
      .getDB()
      .table(this._tableName)
      .where('state', 'active')
      .andWhere('expires_at', '<=', new Date())
      .update({ state: 'expired' }, ['id']);
    return rows.map((row) => row.id);
  }

  // Token ids already promised by outstanding (active, unexpired) links of
  // any of the given sender wallets: excluded when issuing a new one (#847).
  async getActiveReservedTokenIds(senderWalletIds) {
    const rows = await this._session
      .getDB()
      .select('token_ids')
      .table(this._tableName)
      .whereIn('sender_wallet_id', senderWalletIds)
      .andWhere('state', 'active')
      .andWhere('expires_at', '>', new Date());

    const ids = new Set();
    rows.forEach((row) => {
      const tokenIds = Array.isArray(row.token_ids)
        ? row.token_ids
        : JSON.parse(row.token_ids || '[]');
      tokenIds.forEach((id) => ids.add(id));
    });
    return ids;
  }
}

module.exports = ActionTokenRepository;
