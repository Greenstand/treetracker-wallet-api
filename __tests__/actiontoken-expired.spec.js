/*
 * Integration test for issue send tokens via email: redeeming an expired action token is denied
 * and no transfer happens
 */
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const JWTService = require('../server/services/JWTService');

chai.use(require('chai-uuid'));

const { apiKey } = seed;

describe('Redeem an expired action token', () => {
  let bearerToken;
  let bearerTokenB;
  let expiredActionToken;

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

    expiredActionToken = JWTService.signActionToken(
      {
        sub: 'samwel@example.com',
        sender_wallet_id: seed.wallet.id,
        token_ids: [seed.token.id],
      },
      { expiresIn: '-1s' },
    );
  });

  it(`${seed.walletB.name} is denied with 401 when redeeming an expired token`, async () => {
    const res = await request(server)
      .post('/action-tokens/redeem')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: expiredActionToken });

    expect(res).to.have.property('statusCode', 401);
  });

  it(`the token still belongs to ${seed.wallet.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('id').eq(seed.token.id);
  });
});
