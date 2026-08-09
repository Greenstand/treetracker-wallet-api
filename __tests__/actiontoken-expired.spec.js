/**
 * Integration test: redeeming an expired action token is denied, no transfer
*/
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const ActionTokenService = require('../server/services/ActionTokenService');

chai.use(require('chai-uuid'));

describe('Redeem an expired action token', () => {
  let bearerToken;
  let bearerTokenB;
  let expiredActionToken;

  before(async () => {
    await seed.clear();
    await seed.seed();
    bearerToken = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;

    expiredActionToken = ActionTokenService.signActionToken(
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
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: expiredActionToken });

    expect(res).to.have.property('statusCode', 401);
  });

  it(`the token still belongs to ${seed.wallet.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('id').eq(seed.token.id);
  });
});
