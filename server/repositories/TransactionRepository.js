const BaseRepository = require('./BaseRepository');

class TransactionRepository extends BaseRepository {
  constructor(session) {
    super('transaction', session);
    this._tableName = 'transaction';
    this._session = session;
  }

  async getByFilter(filter, limitOptions) {
    let promise = this._session
      .getDB()
      .select(
        'transaction.*',
        'source_wallet.name as sender_wallet',
        'destination_wallet.name as receiver_wallet',
      )
      .table(this._tableName)
      .leftJoin(
        'wallet as source_wallet',
        'transaction.source_wallet_id',
        '=',
        'source_wallet.id',
      )
      .leftJoin(
        'wallet as destination_wallet',
        'transaction.destination_wallet_id',
        '=',
        'destination_wallet.id',
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

module.exports = TransactionRepository;
