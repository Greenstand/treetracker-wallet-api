const expect = require('expect-runtime');
const knex = require('knex')({
  client: 'pg',
//  debug: true,
  connection: require('../../config/config').connectionString,
});

class TrustModel{
  get(){
    //const trust_relationship_instance = new trust_relationship(1);
    const list = knex.select()
      .table("trust_relationship");
    return list;
  }

  request(requestType, walletName){
    expect(requestType).oneOf(Object.keys(TrustModel.ENTITY_TRUST_REQUEST_TYPE));
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
