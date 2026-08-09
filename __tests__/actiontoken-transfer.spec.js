
 // Integration test: issue an action token, redeem it from a second wallet
 // Auth: Bearer is the wallet's keycloak_account_id (JWTService.verify stubbed by mocks.js)
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');

chai.use(require('chai-uuid'));

describe('Issue and redeem an action token', () => {
  let bearerToken;
  let bearerTokenB;
  let actionToken;

  before(async () => {
    await seed.clear();
    await seed.seed();
    bearerToken = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;
  });

  it(`${seed.wallet.name} issues an action token for its token`, async () => {
    const res = await request(server)
      .post('/action-tokens')
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
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: actionToken });

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('state', 'completed');
    expect(res.body.parameters.tokens).to.include(seed.token.id);
  });

  it(`the token now belongs to ${seed.walletB.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('id').eq(seed.token.id);
  });

  it(`the token no longer belongs to ${seed.wallet.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 403);
  });
});
