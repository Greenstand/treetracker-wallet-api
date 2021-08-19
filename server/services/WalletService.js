const { validate: uuidValidate } = require('uuid');
const WalletRepository = require('../repositories/WalletRepository');
const Wallet = require('../models/Wallet');
const HttpError = require("../utils/HttpError");

class WalletService {
  constructor(session){
    this._session = session;
    this.walletRepository = new WalletRepository(session);
  }

  async getById(id) {
    const object = await this.walletRepository.getById(id);
    const wallet = new Wallet(object.id, this._session);
    return wallet;
  }

  async getByName(name) {
    const object = await this.walletRepository.getByName(name);
    const wallet = new Wallet(object.id, this._session);
    return wallet;
  }

  async getByIdOrName(idOrName) {
    let walletObject;
    if(uuidValidate(idOrName)){
      walletObject = await this.walletRepository.getById(idOrName);
    } else if (typeof idOrName === 'string') {
      walletObject = await this.walletRepository.getByName(idOrName);
    } else {
      throw new HttpError(404, `Type must be number or string: ${idOrName}`);
    }
    const wallet = new Wallet(walletObject.id, this._session);
    return wallet;
  }

  /*
   * A faster way to get sub wallet list directly, from DB, and count
   * the token in these wallet
   */
  async getSubWalletList(walletId, offset, limit){
    const result = await this._session.getDB().raw(`
      SELECT w.*, tokens_in_wallet FROM
      wallet w
      JOIN 
      (
      /* including the wallet himself */
      SELECT '${walletId}' AS sub_wallet_id
      UNION 
      /* manage */
      SELECT
        wt.target_wallet_id AS sub_wallet_id
      FROM
        wallet_trust wt
      WHERE
        wt."state" = 'trusted'
        AND actor_wallet_id = '${walletId}'
        AND wt.request_type = 'manage'
      UNION
      /* yield */
      SELECT
        wt.actor_wallet_id AS sub_wallet_id 
      FROM
        wallet_trust wt
      WHERE
        wt."state" = 'trusted'
        AND target_wallet_id = '${walletId}'
        AND wt.request_type = 'yield'
      ) sub_wallet_ids
      ON w.id = sub_wallet_ids.sub_wallet_id
      JOIN (
        SELECT wallet_id, count(wallet_id) tokens_in_wallet FROM "token" GROUP BY wallet_id
      ) token_stat
      ON w.id = token_stat.wallet_id
      ORDER BY name
      OFFSET ${offset} 
      LIMIT ${limit}
    `);
    console.log("xxx:", result);
    return result.rows;
  }
}

module.exports = WalletService;
