// Integration test: a share link and a normal send must not promise the same
// token. Links now reserve with transfer_pending, the flag every transfer
// path already honours.
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const uuid = require('uuid');
const server = require('../server/app');
const seed = require('./seed');
const knex = require('../server/infra/database/knex');

chai.use(require('chai-uuid'));

const createLink = (bearer, size, wallet) =>
  request(server)
    .post('/action-tokens')
    .set('Authorization', `Bearer ${bearer}`)
    .send({
      recipient_email: 'samwel@example.com',
      bundle: { bundle_size: size },
      sender_wallet: wallet,
    });

const sendBundle = (bearer, size, from, to) =>
  request(server)
    .post('/transfers')
    .set('Authorization', `Bearer ${bearer}`)
    .send({
      bundle: { bundle_size: size },
      sender_wallet: from,
      receiver_wallet: to,
      claim: false,
    });

describe('Share link reservations block a normal send', () => {
  let bearer;
  let bearerB;

  beforeEach(async () => {
    await seed.clear();
    await seed.seed();
    bearer = seed.wallet.keycloak_account_id;
    bearerB = seed.walletB.keycloak_account_id;
  });

  it('a link takes one of two tokens, the send takes the other, the link still redeems', async () => {
    await seed.addTokenToWallet(seed.wallet.id);

    const link = await createLink(bearer, 1, seed.wallet.name);
    expect(link).to.have.property('statusCode', 201);

    const promised = await knex('token').where({ action_token_id: link.body.id });
    expect(promised).lengthOf(1);
    expect(promised[0].transfer_pending).eq(true);

    const send = await sendBundle(bearer, 1, seed.wallet.name, seed.walletB.name);
    expect(send.statusCode).to.be.oneOf([200, 201, 202]);

    // The send must not have taken the promised token.
    const stillHere = await knex('token').where({ id: promised[0].id });
    expect(stillHere[0].wallet_id).eq(seed.wallet.id);

    const redeem = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerB}`)
      .send({ action_token: link.body.action_token });
    expect(redeem).to.have.property('statusCode', 200);
  });

  it('the last free token is promised, so a normal send is refused', async () => {
    const link = await createLink(bearer, 1, seed.wallet.name);
    expect(link).to.have.property('statusCode', 201);

    const send = await sendBundle(bearer, 1, seed.wallet.name, seed.walletB.name);
    expect(send).to.have.property('statusCode', 409);
  });

  it('cancelling the link frees the token again', async () => {
    const link = await createLink(bearer, 1, seed.wallet.name);

    const cancel = await request(server)
      .delete(`/action-tokens/${link.body.id}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearer}`);
    expect(cancel).to.have.property('statusCode', 200);

    const freed = await knex('token').where({ wallet_id: seed.wallet.id });
    expect(freed[0].transfer_pending).eq(false);
    expect(freed[0].action_token_id).eq(null);

    const send = await sendBundle(bearer, 1, seed.wallet.name, seed.walletB.name);
    expect(send.statusCode).to.be.oneOf([200, 201, 202]);
  });

  it('two concurrent links for the last token leave exactly one alive', async () => {
    const results = await Promise.all([
      createLink(bearer, 1, seed.wallet.name),
      createLink(bearer, 1, seed.wallet.name),
    ]);
    const created = results.filter((r) => r.statusCode === 201);
    expect(created).lengthOf(1);
  });

  it('an expired link hands its token back on the next link activity', async () => {
    const link = await createLink(bearer, 1, seed.wallet.name);

    await knex('action_token')
      .where({ id: link.body.id })
      .update({ expires_at: new Date(Date.now() - 1000) });

    // Any link activity by anyone runs the lazy release.
    await request(server)
      .get('/action-tokens')
      .set('Authorization', `Bearer ${bearerB}`);

    const freed = await knex('token').where({ wallet_id: seed.wallet.id });
    expect(freed[0].transfer_pending).eq(false);
    expect(freed[0].action_token_id).eq(null);

    const [record] = await knex('action_token').where({ id: link.body.id });
    expect(record.state).eq('expired');
  });

  it('redeeming clears the flag on the tokens that moved', async () => {
    const link = await createLink(bearer, 1, seed.wallet.name);

    const redeem = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerB}`)
      .send({ action_token: link.body.action_token });
    expect(redeem).to.have.property('statusCode', 200);

    const moved = await knex('token').where({ wallet_id: seed.walletB.id });
    expect(moved).lengthOf(1);
    expect(moved[0].transfer_pending).eq(false);
    expect(moved[0].action_token_id).eq(null);
  });

  it('an explicit token of a managed wallet needs sender_wallet, and a refusal flags nothing', async () => {
    // walletB manages walletC and may read tokenB, but without sender_wallet
    // the link would speak for walletB, which does not own it. Claim time
    // would refuse it, so refuse now, and leave no reservation behind.
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerB}`)
      .send({
        recipient_email: 'samwel@example.com',
        tokens: [seed.tokenB.id],
      });
    expect(res).to.have.property('statusCode', 409);

    const flagged = await knex('token').whereNotNull('action_token_id');
    expect(flagged).lengthOf(0);
    const rows = await knex('action_token');
    expect(rows).lengthOf(0);
  });

  it('a token flagged for a link that has no row is released on the next link activity', async () => {
    // What a crash between flag and insert would leave behind.
    await knex('token')
      .where({ id: seed.token.id })
      .update({ transfer_pending: true, action_token_id: uuid.v4() });

    await request(server)
      .get('/action-tokens')
      .set('Authorization', `Bearer ${bearerB}`);

    const [healed] = await knex('token').where({ id: seed.token.id });
    expect(healed.transfer_pending).eq(false);
    expect(healed.action_token_id).eq(null);
  });

  it('expired links can be listed by state', async () => {
    const link = await createLink(bearer, 1, seed.wallet.name);
    await knex('action_token')
      .where({ id: link.body.id })
      .update({ expires_at: new Date(Date.now() - 1000) });

    const res = await request(server)
      .get('/action-tokens?state=expired')
      .set('Authorization', `Bearer ${bearer}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.action_tokens.map((a) => a.id)).to.include(link.body.id);
  });
});
