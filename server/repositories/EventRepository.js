const log = require('loglevel');
const BaseRepository = require('./BaseRepository');

class EventRepository extends BaseRepository {
  constructor(session) {
    super('wallet_event', session);
    this._tableName = 'wallet_event';
    this._session = session;
  }

  async getAllEvents(filter, limitOptions) {
    log.info(filter);
    let promise = this._session
      .getDB()
      .select('wallet_event.*')
      .table('wallet_event')
      .where((builder) => this.whereBuilder(filter, builder));

    if (limitOptions && limitOptions.limit) {
      promise = promise.limit(limitOptions.limit);
    }

    return promise;
  }
}

module.exports = EventRepository;
