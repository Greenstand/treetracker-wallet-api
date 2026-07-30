/*
 * Integration test for send tokens via email: a wallet owner issues an action token and a
 * second wallet redeems it to receive the tokens.
 */
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');

chai.use(require('chai-uuid'));

const { apiKey } = seed;

describe('Issue and redeem an action token', () => {
  let bearerToken;
  let bearerTokenB;
  let actionToken;

  before(async () => {
    await seed.clear();
    await seed.seed();

    {
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', apiKey)
        .send({ wallet: seed.wallet.name, password: seed.wallet.password });
      expect(res).to.have.property('statusCode', 200);
      bearerToken = res.body.token;
    }

    {
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', apiKey)
        .send({ wallet: seed.walletB.name, password: seed.walletB.password });
      expect(res).to.have.property('statusCode', 200);
      bearerTokenB = res.body.token;
    }
  });

  it(`${seed.wallet.name} issues an action token for its token`, async () => {
    const res = await request(server)
      .post('/action-tokens')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ recipient_email: 'samwel@example.com', tokens: [seed.token.id] });

    expect(res).to.have.property('statusCode', 201);
    expect(res.body).to.have.property('action_token').that.match(/\S+/);
    expect(res.body).to.have.property('token_count', 1);
    expect(res.body).to.have.property('expires_at');
    actionToken = res.body.action_token;
  });

  it(`${seed.walletB.name} redeems the action token and the transfer completes`, async () => {
    const res = await request(server)
      .post('/action-tokens/redeem')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: actionToken });

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('state', 'completed');
    expect(res.body.parameters.tokens).to.include(seed.token.id);
  });

  it(`the token now belongs to ${seed.walletB.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('id').eq(seed.token.id);
  });

  it(`the token no longer belongs to ${seed.wallet.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 403);
  });
});
