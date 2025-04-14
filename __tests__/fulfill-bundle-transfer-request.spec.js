require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
chai.use(require('chai-uuid'));

describe('Request and fulfill a bundle transfer', () => {
  let bearerToken;
  let bearerTokenB;
  let requestedTransferId;

  before(async () => {
    await seed.clear();
    await seed.seed();

    {
      // Authorizes before each of the follow tests
      const res = await request(server).post('/auth').send({
        wallet: seed.wallet.name,
        password: seed.wallet.password,
      });
      expect(res).to.have.property('statusCode', 200);
      bearerToken = res.body.token;
      expect(bearerToken).to.match(/\S+/);
    }

    {
      // Authorizes before each of the follow tests
      const res = await request(server).post('/auth').send({
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

  it(`WalletB:${seed.walletB.name} request a bundle of token from ${seed.wallet.name}, should get 202`, async () => {
    const res = await request(server)
      .post('/transfers')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({
        bundle: {
          bundle_size: 1,
        },
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
        claim: false,
      });
    expect(res).property('statusCode').to.eq(202);
  });

  it(`${seed.wallet.name} should find a requested transfer sent to it`, async () => {
    const res = await request(server)
      .get('/transfers?state=requested&limit=1000')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).property('statusCode').to.eq(200);
    expect(res.body).property('transfers').lengthOf(1);
    expect(res.body.transfers[0]).property('state').eq('requested');
    expect(res.body.transfers[0]).property('id').to.be.a.uuid('v4');
    requestedTransferId = res.body.transfers[0].id;
  });

  it(`${seed.wallet.name} fulfill this requested transfer with tokens`, async () => {
    const res = await request(server)
      .post(`/transfers/${requestedTransferId}/fulfill`)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tokens: [seed.token.id],
      });
    expect(res).property('statusCode').to.eq(200);
  });

  it(`${seed.walletB.name} should be able to find requested transfer has been completed`, async () => {
    const res = await request(server)
      .get('/transfers?state=completed&limit=1000')
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).property('statusCode').to.eq(200);
    expect(res.body).property('transfers').lengthOf(1);
    expect(res.body.transfers[0]).property('state').eq('completed');
    expect(res.body.transfers[0]).property('id').eq(requestedTransferId);
  });

  it(`Token:#${seed.token.id} now should still belong to ${seed.walletB.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.wallet_id).eq(seed.walletB.id);
  });
});
