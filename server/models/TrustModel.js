const expect = require('expect-runtime');
const knex = require('knex')({
  client: 'pg',
//  debug: true,
  connection: require('../../config/config').connectionString,
});
const HttpError = require("./HttpError");

class TrustModel{
  async get(){
    //const trust_relationship_instance = new trust_relationship(1);
    const list = await knex.select()
      .table("trust_relationship");
    return list;
  }

  async request(requestType, walletName){
    expect(requestType, () => new HttpError(`The trust request type muse be one of ${Object.keys(TrustModel.ENTITY_TRUST_REQUEST_TYPE).join(',')}`, 400))
      .oneOf(Object.keys(TrustModel.ENTITY_TRUST_REQUEST_TYPE));
    console.log("walletName", walletName);
    expect(walletName, "Invalid wallet name")
      .match(/test/);
    await knex("trust_relationship").insert({
      request_type: requestType,
      wallet: walletName,
    });
  }
}

TrustModel.ENTITY_TRUST_TYPE = {
  send: 'send',
  manage: 'manage',
  deduct: 'deduct',
}

TrustModel.ENTITY_TRUST_STATE_TYPE = {
  requested: 'requested',
  cancelled_by_originator: 'cancelled_by_orginator',
  canceled_by_actor: 'canceled_by_actor',
  trusted: 'truested',
}

TrustModel.ENTITY_TRUST_REQUEST_TYPE = {
  send: 'send',
  received: 'received',
  manage: 'manage',
  yield: 'yield',
  deduct: 'deduct',
  release: 'release',
}

module.exports = TrustModel;
