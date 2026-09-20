// Integration test: a wallet's counters must separate what it holds from what
// it can actually send, so the screen and the send guard cannot disagree.
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const knex = require('../server/infra/database/knex');

chai.use(require('chai-uuid'));

describe('Wallet token counters', () => {
  let bearerToken;

  before(async () => {
    await seed.clear();
    await seed.seed();
    bearerToken = seed.wallet.keycloak_account_id;

    // The seed gives the wallet one token; take it to five.
    await Promise.all(
      [0, 1, 2, 3].map(() => seed.addTokenToWallet(seed.wallet.id)),
    );

    // Reserve three, as a pending send does, and claim one of the rest.
    const all = await knex('token').where({ wallet_id: seed.wallet.id });
    await knex('token')
      .whereIn(
        'id',
        all.slice(0, 3).map((t) => t.id),
      )
      .update({ transfer_pending: true });
    await knex('token').where({ id: all[3].id }).update({ claim: true });
  });

  it('GET /wallets separates held, sendable and pending', async () => {
    const res = await request(server)
      .get('/wallets?limit=10')
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 200);
    const wallet = res.body.wallets.find((w) => w.name === seed.wallet.name);
    expect(wallet).to.have.property('tokens_in_wallet', 5);
    // One free and unclaimed: three are reserved, one is claimed.
    expect(wallet).to.have.property('tokens_available', 1);
    expect(wallet).to.have.property('tokens_pending', 3);
  });

  it('GET /wallets/:id reports the same numbers', async () => {
    const res = await request(server)
      .get(`/wallets/${seed.wallet.id}`)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('tokens_in_wallet', 5);
    expect(res.body).to.have.property('tokens_available', 1);
    expect(res.body).to.have.property('tokens_pending', 3);
  });
});
