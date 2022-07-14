/*
 * The model for: entity, wallet, entity table and so on
 */
const expect = require('expect-runtime');
const HttpError = require('../utils/HttpError');
const TrustRelationshipEnums = require('../utils/trust-enums');
const BaseRepository = require('./BaseRepository');

class WalletRepository extends BaseRepository {
  constructor(session) {
    super('wallet', session);
    this._tableName = 'wallet';
    this._session = session;
  }

  async getByName(wallet) {
    expect(
      wallet,
      () => new HttpError(400, `invalid wallet name:${wallet}`),
    ).match(/^\S+$/);
    const list = await this._session
      .getDB()
      .select()
      .table(this._tableName)
      .where('name', wallet);
    expect(
      list,
      () =>
        new HttpError(404, `Could not find entity by wallet name: ${wallet}`),
    )
      .defined()
      .lengthOf(1);
    return list[0];
  }

  async getById(id) {
    const object = await this._session
      .getDB()
      .select()
      .table(this._tableName)
      .where('id', id)
      .first();
    if (!object) {
      throw new HttpError(404, `Could not find wallet by id: ${id}`);
    }
    return object;
  }

  // Get a wallet itself including its sub wallets
  async getAllWallets(id, limitOptions) {
    let promise = this._session
      .getDB()
      .select('id', 'name', 'logo_url', 'created_at')
      .table('wallet')
      .where('id', id)
      .union(
        this._session
          .getDB()
          .select(
            'wallet.id',
            'wallet.name',
            'wallet.logo_url',
            'wallet.created_at',
          )
          .table('wallet_trust')
          .join('wallet', 'wallet_trust.target_wallet_id', '=', 'wallet.id')
          .where({
            'wallet_trust.actor_wallet_id': id,
            'wallet_trust.request_type':
              TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
            'wallet_trust.state':
              TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
          }),
        this._session
          .getDB()
          .select(
            'wallet.id',
            'wallet.name',
            'wallet.logo_url',
            'wallet.created_at',
          )
          .table('wallet_trust')
          .join('wallet', 'wallet_trust.actor_wallet_id', '=', 'wallet.id')
          .where({
            'wallet_trust.target_wallet_id': id,
            'wallet_trust.request_type':
              TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
            'wallet_trust.state':
              TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
          }),
      );

    if (limitOptions && limitOptions.limit) {
      promise = promise.limit(limitOptions.limit);
    }

    if (limitOptions && limitOptions.offset) {
      promise = promise.offset(limitOptions.offset);
    }

    return promise;
  }
}

module.exports = WalletRepository;
