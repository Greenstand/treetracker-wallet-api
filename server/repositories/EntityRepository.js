/* 
 * The model for: entity, wallet, entity table and so on
 */
const HttpError = require("../utils/HttpError");
const knex = require('../../server/database/knex');
const expect = require("expect-runtime");

class EntityRepository {

  async getEntityByWalletName(wallet){
    expect(wallet, () => new HttpError(400, `invalid wallet name:${wallet}`))
      .match(/^\S+$/);
    const list = await knex.select().table('wallets.wallet').where('name', wallet);
    expect(list, () => new HttpError(404, `can not find entity by wallet name:${wallet}`)).defined().lengthOf(1);
    return list[0];
  }
}

module.exports = EntityRepository;
