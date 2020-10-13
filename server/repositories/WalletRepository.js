/* 
 * The model for: entity, wallet, entity table and so on
 */
const HttpError = require("../utils/HttpError");
const expect = require("expect-runtime");
const Session = require("../models/Session");

class WalletRepository {

  constructor(session){
    expect(session).instanceOf(Session);
    this._session = session;
  }

  async getByName(wallet){
    expect(wallet, () => new HttpError(400, `invalid wallet name:${wallet}`))
      .match(/^\S+$/);
    const list = await this._session.getDB().select().table('wallets.wallet').where('name', wallet);
    expect(list, () => new HttpError(404, `can not find entity by wallet name:${wallet}`)).defined().lengthOf(1);
    return list[0];
  }

  async getById(id){
    const object = await this._session.getDB().select().table('wallets.wallet').where('id', id).first();
    if(!object){
      throw new HttpError(404, "Can not found wallet by id");
    }
    return object;
  }

}

module.exports = WalletRepository;
