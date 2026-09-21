// Integration test: share-link generation must not promise tokens that a
// pending send has already reserved, or the recipient hits a 409 at redeem.
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const knex = require('../server/infra/database/knex');

chai.use(require('chai-uuid'));

describe('Share link generation skips reserved tokens', () => {
  let bearerToken;

  before(async () => {
    await seed.clear();
    await seed.seed();
    bearerToken = seed.wallet.keycloak_account_id;

    // The seed gives the wallet one token; take it to five.
    await Promise.all([0, 1, 2, 3].map(() => seed.addTokenToWallet(seed.wallet.id)));

    // Reserve three of them, as a pending send does.
    const free = await knex('token')
      .where({ wallet_id: seed.wallet.id })
      .limit(3);
    await knex('token')
      .whereIn(
        'id',
        free.map((t) => t.id),
      )
      .update({ transfer_pending: true });
  });

  it('the wallet holds five tokens, three of them reserved', async () => {
    const all = await knex('token').where({ wallet_id: seed.wallet.id });
    const reserved = all.filter((t) => t.transfer_pending);
    expect(all).lengthOf(5);
    expect(reserved).lengthOf(3);
  });

  it('a link for three is refused, only two are available', async () => {
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        recipient_email: 'samwel@example.com',
        bundle: { bundle_size: 3 },
        sender_wallet: seed.wallet.name,
      });

    expect(res).to.have.property('statusCode', 409);
    expect(res.body.message).to.match(/does not have 3 tokens available/);
  });

  it('a link for two succeeds and names no reserved token', async () => {
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        recipient_email: 'samwel@example.com',
        bundle: { bundle_size: 2 },
        sender_wallet: seed.wallet.name,
      });

    expect(res).to.have.property('statusCode', 201);

    const [record] = await knex('action_token').where({
      sender_wallet_id: seed.wallet.id,
    });
    const promised = await knex('token').whereIn('id', record.token_ids);
    expect(promised).lengthOf(2);
    // The link claims what it promises, so each token is now reserved to it
    // rather than to the pending send.
    promised.forEach((token) => {
      expect(token.transfer_pending).eq(true);
      expect(token.action_token_id).eq(record.id);
    });
  });
});
