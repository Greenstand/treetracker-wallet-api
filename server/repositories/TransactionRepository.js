const BaseRepository = require('./BaseRepository');

class TransferRepository extends BaseRepository {
  constructor(session) {
    super('transaction', session);
    this._tableName = 'transaction';
    this._session = session;
  }

  async getByFilter(filter, limitOptions) {
    const promise = this._knex
      .select(
        'transaction.*',
        'source_wallet.name as sender_wallet',
        'destination_wallet.name as receiver_wallet',
      )
      .table(this._tableName)
      // leftJoin or join for the three of them ?
      .leftJoin(
        'wallet as source_wallet',
        'transaction.source_wallet_id',
        '=',
        'originator_wallet.id',
      )
      .leftJoin(
        'wallet as destination_wallet',
        'transaction.destination_wallet_id',
        '=',
        'actor_wallet.id',
      )
      .where((builder) => this.whereBuilder(filter, builder));

    if (limitOptions && limitOptions.limit) {
      promise = promise.limit(limitOptions.limit);
    }

    if (limitOptions && limitOptions.offset) {
      promise = promise.offset(limitOptions.offset);
    }

    return promise;
  }
}

module.exports = TransferRepository;
