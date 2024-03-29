require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const TransferEnums = require('../server/utils/transfer-enum');
chai.use(require('chai-uuid'));

const { apiKey } = seed;

describe('Create and cancel a pending transfer', () => {
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
  });

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
  });

  it('Get all pending transfers belongs to walletB, should have one', async () => {
    const res = await request(server)
      .get(`/transfers?state=pending&wallet=${seed.wallet.name}&limit=1000`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.transfers).lengthOf(1);
    [pendingTransfer] = res.body.transfers;
    expect(pendingTransfer)
      .property('destination_wallet')
      .eq(seed.walletB.name);
  });

  it('Delete/cancel the pending transfer', async () => {
    const res = await request(server)
      .del(`/transfers/${pendingTransfer.id}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
  });

  it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be cancelled`, async () => {
    const res = await request(server)
      .get(`/transfers?limit=1000`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.transfers).lengthOf(1);
    expect(res.body.transfers[0])
      .property('state')
      .eq(TransferEnums.STATE.cancelled);
  });

  it(`Token:#${seed.token.id} now shouldn't be pending `, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.transfer_pending).eq(false);
  });
});
