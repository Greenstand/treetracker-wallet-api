require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const server = require('../server/app');
const seed = require('./seed');

describe('Transfers sent to a second wallet of the account', () => {
  let bearerTokenA;
  let bearerTokenB;
  let secondWalletId;

  beforeEach(async () => {
    await seed.clear();
    await seed.seed();
    bearerTokenA = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;

    const created = await request(server)
      .post('/wallets')
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({ wallet: 'walletA-second' })
      .expect(201);
    secondWalletId = created.body.id;

    await request(server)
      .post('/transfers')
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({
        tokens: [seed.tokenB.id],
        sender_wallet: seed.walletC.name,
        receiver_wallet: 'walletA-second',
      })
      .expect(202);
  });

  it('are visible to the account that owns the second wallet', async () => {
    const res = await request(server)
      .get('/transfers')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .expect(200);

    const mine = res.body.transfers.filter(
      (t) => t.destination_wallet === 'walletA-second',
    );
    expect(mine).lengthOf(1);
    expect(mine[0]).to.have.property('state', 'pending');
  });

  it('can be accepted by that account', async () => {
    const listed = await request(server)
      .get('/transfers')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .expect(200);

    const pending = listed.body.transfers.find(
      (t) => t.destination_wallet === 'walletA-second',
    );

    const accepted = await request(server)
      .post(`/transfers/${pending.id}/accept`)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(accepted).to.have.property('statusCode', 200);
    expect(accepted.body).to.have.property('state', 'completed');
  });

  it('does not leak transfers between unrelated accounts', async () => {
    const res = await request(server)
      .get('/transfers')
      .set('Authorization', `Bearer ${seed.walletC.keycloak_account_id}`)
      .expect(200);

    const walletIds = [seed.wallet.id, secondWalletId];
    const leaked = res.body.transfers.filter(
      (t) =>
        walletIds.includes(t.source_wallet_id) ||
        walletIds.includes(t.destination_wallet_id),
    );
    expect(leaked).lengthOf(0);
  });
});
