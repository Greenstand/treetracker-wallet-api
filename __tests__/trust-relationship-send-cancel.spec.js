require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const TrustRelationship = require('../server/utils/trust-enums');
chai.use(require('chai-uuid'));

describe('Trust relationship: cancel send', () => {
  let bearerToken;
  let trustRelationship;

  before(async () => {
    await seed.clear();
    await seed.seed();

    bearerToken = seed.wallet.keycloak_account_id;

    const res = await request(server)
      .post('/trust_relationships')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        trust_request_type: 'send',
        requestee_wallet: seed.walletB.name,
      });
    expect(res).property('statusCode').to.eq(201);
    trustRelationship = res.body;
  });

  it(`Cancel this request by ${seed.wallet.name}`, async () => {
    const res = await request(server)
      .del(`/trust_relationships/${trustRelationship.id}`)
      .set('Authorization', `Bearer ${bearerToken}`);
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
      .eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.cancelled_by_originator);
  });
});
