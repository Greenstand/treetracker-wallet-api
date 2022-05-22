require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const log = require('loglevel');
const sinon = require('sinon');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const Transfer = require('../server/models/Transfer');
const TrustRelationship = require('../server/models/TrustRelationship');
chai.use(require('chai-uuid'));

const { apiKey } = seed;

describe('Create and accept a pending transfer', () => {
  let bearerToken;
  let bearerTokenB;

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
  });

  beforeEach(async () => {
    sinon.restore();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  let transferId;
  let pendingTransfer;

  it(`Creates a pending transaction `, async () => {
    const res = await request(server)
      .post('/transfers')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tokens: [seed.token.id],
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
      });
    expect(res).property('statusCode').to.eq(202);
    expect(res).property('body').property('id').to.be.a.uuid('v4');
    expect(res)
      .property('body')
      .property('parameters')
      .property('tokens')
      .lengthOf(1);
    expect(res.body.parameters.tokens[0]).eq(seed.token.id);
    transferId = res.body.id;
  });

  it(`Token:#${seed.token.id} now should be pending `, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.transfer_pending).eq(true);
  });

  it('Get all pending transfers belongs to walletB, should have one', async () => {
    const res = await request(server)
      .get(`/transfers?state=pending&wallet=${seed.wallet.name}&limit=1000`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.transfers).lengthOf(1);
    pendingTransfer = res.body.transfers[0];
    expect(pendingTransfer)
      .property('destination_wallet')
      .eq(seed.walletB.name);
  });

  it('Accept the pending transfer', async () => {
    const res = await request(server)
      .post(`/transfers/${pendingTransfer.id}/accept`)
      .set('Content-Type', 'application/json')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
  });

  it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be completed 1`, async () => {
    const res = await request(server)
      .get(`/transfers?limit=1000`)
      .set('treetracker-api-key', apiKey)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.transfers).lengthOf(1);
    expect(res.body.transfers[0])
      .property('state')
      .eq(Transfer.STATE.completed);
  });

  it(`Token:#${seed.token.id} now should belong to ${seed.walletB.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.wallet_id).eq(seed.walletB.id);
  });

  it(`Token:#${seed.token.id} now should have some transaction history`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}/transactions?limit=1000`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.history).lengthOf(1);
    expect(res.body.history[0]).property('sender_wallet').eq(seed.wallet.name);
    expect(res.body.history[0])
      .property('receiver_wallet')
      .eq(seed.walletB.name);
  });
});
