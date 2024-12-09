const BaseRepository = require('./BaseRepository');

class TrustRepository extends BaseRepository {
  constructor(session) {
    super('wallet_trust', session);
    this._tableName = 'wallet_trust';
    this._session = session;
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

  async getByFilter(
    filter,
    limitOptions = {},
    loggedInWalletId = '',
    managedWalletIds = [],
  ) {
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

    const count = await this._session.getDB().from(promise.as('p')).count('*');

    let order = 'desc';
    let column = 'created_at';

    if (limitOptions) {
      if (limitOptions.order) {
        order = limitOptions.order;
      }

      if (limitOptions.sort_by) {
        column = limitOptions.sort_by;
      }

      if (limitOptions.limit) {
        promise = promise.limit(limitOptions.limit);
      }

      if (limitOptions.offset) {
        promise = promise.offset(limitOptions.offset);
      }
    }

    // order by priority (which is requested state)
    // target is current wallet or one of its managed wallets
    if (managedWalletIds.length > 0 && loggedInWalletId) {
      promise = promise.select(
        this._session.getDB().raw(
          `CASE
         WHEN wallet_trust.state = 'requested' AND
              (wallet_trust.target_wallet_id = ? OR wallet_trust.target_wallet_id IN (${managedWalletIds
                .map(() => '?')
                .join(',')})) THEN 1
         ELSE 0
       END AS priority`,
          [loggedInWalletId, ...managedWalletIds],
        ),
      );
      promise = promise.orderBy([
        { column: 'priority', order: 'desc' },
        { column, order }, // secondary
      ]);
    } else {
      // normal ordering for other endpoints
      promise = promise.orderBy(column, order);
    }

    const result = await promise;

    return { result, count: +count[0].count };
  }

  async countByFilter(filter) {
    const promise = this._session
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

    const count = await this._session.getDB().from(promise.as('p')).count('*');

    return +count[0].count;
  }

  async getAllByFilter(filter, limitOptions) {
    const subquery = this._session
      .getDB()
      .select(
        'wallet_trust.id',
        'wallet_trust.actor_wallet_id',
        'wallet_trust.target_wallet_id',
        'wallet_trust.type',
        'wallet_trust.originator_wallet_id',
        'wallet_trust.request_type',
        'wallet_trust.state',
        'wallet_trust.created_at',
        'wallet_trust.updated_at',
        'wallet_trust.active',
        'originator_wallet.name as originating_wallet',
        'actor_wallet.name as actor_wallet',
        'target_wallet.name as target_wallet',
      )
      .from('wallet_trust')
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
      .where((builder) => this.whereBuilder(filter, builder))
      .distinctOn('wallet_trust.id')
      .orderBy('wallet_trust.id', 'asc');

    let derivedTable = this._session
      .getDB()
      .select('*')
      .from(subquery.as('subquery'));

    let order = 'desc';
    let column = 'created_at';

    if (limitOptions) {
      if (limitOptions.order) {
        order = limitOptions.order;
      }
      if (limitOptions.sort_by) {
        column = limitOptions.sort_by;
      }
    }

    derivedTable = derivedTable.orderBy(column, order);

    const count = await this._session
      .getDB()
      .from(derivedTable.as('p'))
      .count('*');

    if (limitOptions && limitOptions.limit) {
      derivedTable = derivedTable.limit(limitOptions.limit);
    }
    if (limitOptions && limitOptions.offset) {
      derivedTable = derivedTable.offset(limitOptions.offset);
    }

    const result = await derivedTable;

    return { result, count: +count[0].count };
  }
}

module.exports = TrustRepository;
