require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const server = require('../server/app');
const seed = require('./seed');

const { apiKey } = seed;

describe('Wallet: Get pending transfers summary', () => {
  let bearerTokenA;
  let bearerTokenB;

  before(async () => {
    await seed.clear();
    await seed.seed();

    {
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', apiKey)
        .send({
          wallet: seed.wallet.name,
          password: seed.wallet.password,
        });

      expect(res).to.have.property('statusCode', 200);
      bearerTokenA = res.body.token;
      expect(bearerTokenA).to.match(/\S+/);
    }

    {
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

  it('Should get pending transfers summary with no pending transfers', async () => {
    const res = await request(server)
      .get(`/wallets/${seed.wallet.id}/pending-transfers`)
      .set('treetracker-api-key', apiKey)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(res).property('statusCode').to.eq(200);
    expect(res.body).to.have.property('wallet_id').eq(seed.wallet.id);
    expect(res.body).to.have.property('wallet_name').eq(seed.wallet.name);
    expect(res.body).to.have.property('pending_outgoing');
    expect(res.body.pending_outgoing).to.have.property('total_amount').eq(0);
    expect(res.body.pending_outgoing).to.have.property('count').eq(0);
    expect(res.body).to.have.property('pending_incoming');
    expect(res.body.pending_incoming).to.have.property('total_amount').eq(0);
    expect(res.body.pending_incoming).to.have.property('count').eq(0);
    expect(res.body).to.have.property('net_pending').eq(0);
  });

  it('Should create a pending token transfer and check summary', async () => {
    const transferRes = await request(server)
      .post('/transfers')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({
        tokens: [seed.token.id],
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
      });

    expect(transferRes).property('statusCode').to.eq(202);

    const summaryRes = await request(server)
      .get(`/wallets/${seed.wallet.id}/pending-transfers`)
      .set('treetracker-api-key', apiKey)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(summaryRes).property('statusCode').to.eq(200);
    expect(summaryRes.body.wallet_id).eq(seed.wallet.id);
    expect(summaryRes.body.wallet_name).eq(seed.wallet.name);
    expect(summaryRes.body.pending_outgoing.total_amount).eq(1);
    expect(summaryRes.body.pending_outgoing.count).eq(1);
    expect(summaryRes.body.pending_incoming.total_amount).eq(0);
    expect(summaryRes.body.pending_incoming.count).eq(0);
    expect(summaryRes.body.net_pending).eq(-1);

    const summaryResB = await request(server)
      .get(`/wallets/${seed.walletB.id}/pending-transfers`)
      .set('treetracker-api-key', apiKey)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(summaryResB).property('statusCode').to.eq(200);
    expect(summaryResB.body.wallet_id).eq(seed.walletB.id);
    expect(summaryResB.body.wallet_name).eq(seed.walletB.name);

    expect(summaryResB.body.pending_outgoing.total_amount).eq(0);
    expect(summaryResB.body.pending_outgoing.count).eq(0);

    expect(summaryResB.body.pending_incoming.total_amount).eq(1);
    expect(summaryResB.body.pending_incoming.count).eq(1);

    expect(summaryResB.body.net_pending).eq(1);
  });

  it('Should create a pending bundle transfer and check summary', async () => {

    const transferRes = await request(server)
      .post('/transfers')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({
        bundle: {
          bundle_size: 5,
        },
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
      });

    expect(transferRes).property('statusCode').to.eq(202);

    const summaryRes = await request(server)
      .get(`/wallets/${seed.wallet.id}/pending-transfers`)
      .set('treetracker-api-key', apiKey)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(summaryRes).property('statusCode').to.eq(200);
    expect(summaryRes.body.pending_outgoing.count).eq(2); // 2 transfers
    expect(summaryRes.body.pending_outgoing.total_amount).eq(6); // 1 + 5 tokens
    expect(summaryRes.body.net_pending).eq(-6);
  });

  it('Should return 403 for unauthorized wallet access', async () => {

    const res = await request(server)
      .get(`/wallets/${seed.walletC.id}/pending-transfers`)
      .set('treetracker-api-key', apiKey)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(res).property('statusCode').to.eq(403);
  });

  it('Should allow managed wallet access', async () => {

    const res = await request(server)
      .get(`/wallets/${seed.walletC.id}/pending-transfers`)
      .set('treetracker-api-key', apiKey)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(res).property('statusCode').to.eq(200);
    expect(res.body.wallet_id).eq(seed.walletC.id);
    expect(res.body.wallet_name).eq(seed.walletC.name);
  });

  it('Should validate wallet_id parameter', async () => {
    const res = await request(server)
      .get('/wallets/invalid-uuid/pending-transfers')
      .set('treetracker-api-key', apiKey)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(res).property('statusCode').to.eq(422);
  });
}); 