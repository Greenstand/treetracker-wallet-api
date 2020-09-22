const knex = require('../../server/database/knex');

class TrustModel{
  async get(){
    //const trust_relationship_instance = new trust_relationship(1);
    const list = await knex.select()
      .table("wallets.entity_trust");
    return list;
  }

  async create(trustObject){
    await knex("wallets.entity_trust").insert(trustObject);
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
