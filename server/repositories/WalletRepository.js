/* 
 * The model for: entity, wallet, entity table and so on
 */
const HttpError = require("../utils/HttpError");
const knex = require('../database/knex');
const expect = require("expect-runtime");

class WalletRepository {

  async getByName(wallet){
    expect(wallet, () => new HttpError(400, `invalid wallet name:${wallet}`))
      .match(/^\S+$/);
    const list = await knex.select().table('wallets.wallet').where('name', wallet);
    expect(list, () => new HttpError(404, `can not find entity by wallet name:${wallet}`)).defined().lengthOf(1);
    return list[0];
  }

  async getById(id){
    const object = await knex.select().table('wallets.wallet').where('id', id).first();
    if(!object){
      throw new HttpError(404, "Can not found wallet by id");
    }
    return object;
  }

}

module.exports = WalletRepository;
