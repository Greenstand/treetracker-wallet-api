/* 
 * The model for: entity, wallet, entity table and so on
 */
const HttpError = require("./HttpError");
const knex = require('knex')({
  client: 'pg',
//  debug: true,
  connection: require('../../config/config').connectionString,
});
const expect = require("expect-runtime");

class EntityModel {

  async getEntityByWalletName(wallet){
    expect(wallet, () => new HttpError(`invalid wallet name:${wallet}`))
      .match(/^\S+$/);
    const list = await knex.select().table("entity").where("wallet", wallet);
    expect(list, () => new HttpError(`can not find entity by wallet name:${wallet}`)).defined().lengthOf(1);
    return list[0];
  }
}

module.exports = EntityModel;
