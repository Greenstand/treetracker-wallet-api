require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const TrustRelationship = require('../server/utils/trust-enums');
chai.use(require('chai-uuid'));

const { apiKey } = seed;

describe('Trust relationship: send', () => {
  let bearerToken;
  let bearerTokenB;
  let bearerTokenC;

  before(async () => {
    await seed.clear();
    await seed.seed();

    {
      // Authorizes before each of the follow tests
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', apiKey)
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
        .set('treetracker-api-key', apiKey)
        .send({
          wallet: seed.walletB.name,
          password: seed.walletB.password,
        });
      expect(res).to.have.property('statusCode', 200);
      bearerTokenB = res.body.token;
      expect(bearerTokenB).to.match(/\S+/);
    }

    {
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', apiKey)
        .send({
          wallet: seed.walletC.name,
          password: seed.walletC.password,
        });
      expect(res).to.have.property('statusCode', 200);
      expect(res).property('body').property('token').a('string');
      bearerTokenC = res.body.token;
    }
  });

  beforeEach(async () => {
    sinon.restore();
  });

  let trustRelationship;

  it('Try to send a token to walletB again, should fail, no trust', async () => {
    const res = await request(server)
      .post('/transfers')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tokens: [],
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
      });

    expect(res).property('statusCode').to.eq(202);
    expect(res).property('body').property('state').to.eq('pending');
    expect(res)
      .property('body')
      .property('parameters')
      .property('tokens')
      .lengthOf(0);
  });

  it(`${seed.wallet.name} request "send" trust relationship with ${seed.walletB.name} `, async () => {
    const res = await request(server)
      .post('/trust_relationships')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        trust_request_type: 'send',
        requestee_wallet: seed.walletB.name,
      });
    expect(res).property('statusCode').to.eq(200);
    trustRelationship = res.body;
    expect(trustRelationship).property('id').to.be.a.uuid('v4');
    expect(trustRelationship)
      .property('state')
      .eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested);
  });

  it('Accept this request', async () => {
    const res = await request(server)
      .post(`/trust_relationships/${trustRelationship.id}/accept`)
      .set('Content-Type', 'application/json')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).property('statusCode').to.eq(200);
  });

  it('Wallet should be able to find the relationship, and it was approved', async () => {
    const res = await request(server)
      .get('/trust_relationships?limit=1000')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).property('statusCode').to.eq(200);
    expect(res).property('body').property('trust_relationships').lengthOf(1);
    expect(res.body.trust_relationships[0]).property('id').to.be.a.uuid('v4');
  });

  it('Try to send a token to walletB again, this time, should success, 201', async () => {
    const res = await request(server)
      .post('/transfers')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tokens: [],
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
      });
    expect(res).property('statusCode').to.eq(201);
    expect(res)
      .property('body')
      .property('parameters')
      .property('tokens')
      .lengthOf(0);
  });

  it('Try to send bundle token to walletB again, should success, 201', async () => {
    const res = await request(server)
      .post('/transfers')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        bundle: {
          bundle_size: 1,
        },
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
        claim: false,
      });
    expect(res).property('statusCode').to.eq(201);
  });
});
