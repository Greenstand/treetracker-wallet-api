const HttpError = require("../utils/HttpError");
const knex = require('../database/knex');
const expect = require("expect-runtime");
const Session = require("../models/Session");

class ApiKeyRepository{

  constructor(session){
    expect(session).instanceOf(Session);
    this._session = session;
  }

  async getByApiKey(apiKey){
    const list = await this._session.getDB().select().table('wallets.api_key').where({
      key: apiKey,
//      tree_token_api_access: true,
    });
    if(list.length !== 1){
      throw new HttpError(404, `can not find the apiKey`);
    }
    return list[0];
  }

}

module.exports = ApiKeyRepository;
