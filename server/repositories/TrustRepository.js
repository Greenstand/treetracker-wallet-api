const BaseRepository = require('./BaseRepository');

class TrustRepository extends BaseRepository {
  constructor(session) {
    super('wallet_trust', session);
    this._tableName = 'wallet_trust';
    this._session = session;
  }

  async get() {
    // const trust_relationship_instance = new trust_relationship(1);
    const list = await this._session.getDB().select().table(this._tableName);
    return list;
  }

  async getByOriginatorId(id) {
    const list = await this._session
      .getDB()
      .select()
      .table(this._tableName)
      .where('originator_wallet_id', id);
    return list;
  }

  async getByTargetId(id) {
    const list = await this._session
      .getDB()
      .select()
      .table(this._tableName)
      .where('target_wallet_id', id);
    return list;
  }

  async getTrustedByOriginatorId(id) {
    const list = await this._session
      .getDB()
      .select()
      .table(this._tableName)
      .where({
        originator_wallet_id: id,
        state: require('../utils/trust-enums').ENTITY_TRUST_STATE_TYPE.trusted,
      });
    return list;
  }

  async getByFilter(filter, limitOptions) {
    let promise = this._session
      .getDB()
      .select(
        'wallet_trust.*',
        'originator_wallet.name as originating_wallet',
        'actor_wallet.name as actor_wallet',
        'target_wallet.name as target_wallet',
      )
      .table(this._tableName)
      // leftJoin or join for the three of them ?
      .leftJoin(
        'wallet as originator_wallet',
        'wallet_trust.originator_wallet_id',
        '=',
        'originator_wallet.id',
      )
      .leftJoin(
        'wallet as actor_wallet',
        'wallet_trust.actor_wallet_id',
        '=',
        'actor_wallet.id',
      )
      .leftJoin(
        'wallet as target_wallet',
        'wallet_trust.target_wallet_id',
        '=',
        'target_wallet.id',
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

module.exports = TrustRepository;
