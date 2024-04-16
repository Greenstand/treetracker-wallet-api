/*
 * The model for: entity, wallet, entity table and so on
 */
const Joi = require('joi');
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
    Joi.assert(
      wallet,
      Joi.string()
        .pattern(/^\S+$/)
        .messages({
          'string.pattern.base': `Invalid wallet name: "${wallet}"`,
        }),
    );

    const list = await this._session
      .getDB()
      .select()
      .table(this._tableName)
      .where('name', wallet);

    try {
      Joi.assert(list, Joi.array().required().length(1));
    } catch (error) {
      throw new HttpError(
        404,
        `Could not find entity by wallet name: ${wallet}`,
      );
    }
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
  async getAllWallets(
    id,
    limitOptions,
    name,
    sort_by,
    order,
    created_at_start_date,
    created_at_end_date,
    getCount,
  ) {
        let query = this._session
      .getDB()
      .select('id', 'name', 'about', 'logo_url', 'created_at')
      .table('wallet')
      .where('id', id);

    let union1 = this._session
      .getDB()
      .select(
        'wallet.id',
        'wallet.name',
        'wallet.about',
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
      });

    let union2 = this._session
      .getDB()
      .select(
        'wallet.id',
        'wallet.name',
        'wallet.about',
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
      });

    if (name) {
      union1 = union1.where('name', 'ilike', `%${name}%`);
      union2 = union2.where('name', 'ilike', `%${name}%`);
    }

    query = query.union(union1, union2).orderBy(sort_by, order);

    query = this._session.getDB().select('*').from(query.as('t'));

    if (created_at_start_date) {
      query = query.whereRaw(`cast("created_at" as date) >= ?`, [
        created_at_start_date,
      ]);
    }

    if (created_at_end_date) {
      query = query.whereRaw(`cast("created_at" as date) <= ?`, [
        created_at_end_date,
      ]);
    }

    // total count query (before applying limit and offset options)
    const countQuery = this._session
      .getDB()
      .from(query.clone().as('q'))
      .count('*');

    if (limitOptions && limitOptions.limit) {
      query = query.limit(limitOptions.limit);
    }

    if (limitOptions && limitOptions.offset) {
      query = query.offset(limitOptions.offset);
    }

   try{
    const wallets = await query;
    if (getCount) {
      const count = await countQuery;
      return { wallets, count: +count[0].count };
    }

    return { wallets };
   }catch(err){
    console.log(err);
    throw err;
   }

    
  }
}

module.exports = WalletRepository;
