const expect = require('expect-runtime');
const knex = require('../../server/database/knex');
const HttpError = require("../utils/HttpError");
const EntityModel = require("../models/EntityModel");

class TrustModel{
  async get(){
    //const trust_relationship_instance = new trust_relationship(1);
    const list = await knex.select()
      .table("wallets.entity_trust");
    return list;
  }

  async request(requestType, walletName){
    expect(requestType, () => new HttpError(`The trust request type must be one of ${Object.keys(TrustModel.ENTITY_TRUST_REQUEST_TYPE).join(',')}`, 400))
      .oneOf(Object.keys(TrustModel.ENTITY_TRUST_REQUEST_TYPE));
    expect(walletName, () => new HttpError("Invalid wallet name", 400))
      .match(/\S+/);
    
    //get wallet id
    const entityModel = new EntityModel();
    const wallet = await entityModel.getEntityByWalletName((walletName));
    await knex("wallets.entity_trust").insert({
      request_type: requestType,
      target_entity_id: wallet.id,
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
  cancelled_by_originator: 'cancelled_by_originator',
  canceled_by_actor: 'cancelled_by_actor',
  trusted: 'trusted',
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
