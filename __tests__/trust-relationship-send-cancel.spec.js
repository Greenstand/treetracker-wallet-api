require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const TrustRelationship = require('../server/utils/trust-enums');
chai.use(require('chai-uuid'));

describe('Trust relationship: cancel send', () => {
  let bearerToken;
  let bearerTokenB;
  let trustRelationship;

  before(async () => {
    await seed.clear();
    await seed.seed();

    {
      // Authorizes before each of the follow tests
      const res = await request(server)
        .post('/auth')
        .send({
          wallet: seed.wallet.name,
          password: seed.wallet.password,
        });
      expect(res).to.have.property('statusCode', 200);
      bearerToken = res.body.token;
      expect(bearerToken).to.match(/\S+/);
    }

    {
      // Authorizes before each of the follow tests
      const res = await request(server)
        .post('/auth')
        .send({
          wallet: seed.walletB.name,
          password: seed.walletB.password,
        });
      expect(res).to.have.property('statusCode', 200);
      bearerTokenB = res.body.token;
      expect(bearerTokenB).to.match(/\S+/);
    }

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

  beforeEach(async () => {
    sinon.restore();
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
