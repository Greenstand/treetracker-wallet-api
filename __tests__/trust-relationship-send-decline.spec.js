require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const TrustRelationship = require('../server/utils/trust-enums');
chai.use(require('chai-uuid'));

describe('Trust relationship: decline send', () => {
  let bearerToken;
  let bearerTokenB;

  before(async () => {
    await seed.clear();
    await seed.seed();

    bearerToken = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;
  });

  let trustRelationship;

  it(`${seed.wallet.name} request "send" trust relationship with ${seed.walletB.name} `, async () => {
    const res = await request(server)
      .post('/trust_relationships')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        trust_request_type: 'send',
        requestee_wallet: seed.walletB.name,
      });
    expect(res).property('statusCode').to.eq(201);
    trustRelationship = res.body;
    expect(trustRelationship).property('id').to.be.a.uuid('v4');
    expect(trustRelationship)
      .property('state')
      .eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested);
  });

  it('Decline this request', async () => {
    const res = await request(server)
      .post(`/trust_relationships/${trustRelationship.id}/decline`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).property('statusCode').to.eq(200);
  });

  it('Wallet should be able to find the relationship, and it was cancelled', async () => {
    const res = await request(server)
      .get('/trust_relationships?limit=1000')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).property('statusCode').to.eq(200);
    expect(res).property('body').property('trust_relationships').lengthOf(1);
    expect(res.body.trust_relationships[0]).property('id').to.be.a.uuid('v4');
    expect(res.body.trust_relationships[0])
      .property('state')
      .eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.canceled_by_target);
  });
});
