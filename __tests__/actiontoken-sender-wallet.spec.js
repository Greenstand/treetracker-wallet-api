// Integration test: a share link may name the wallet it draws from, and draws
// from that wallet rather than the login wallet (#869).
// Auth: Bearer is the wallet's keycloak_account_id (JWTService.verify stubbed by mocks.js)
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const server = require('../server/app');
const seed = require('./seed');

describe('Action token: sender_wallet', () => {
  let bearerTokenA;
  let bearerTokenB;

  beforeEach(async () => {
    await seed.clear();
    await seed.seed();
    bearerTokenA = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;
  });

  // The app sends sender_wallet on every share link, so rejecting it as an
  // unknown key broke the feature outright.
  it('accepts sender_wallet naming the login wallet', async () => {
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({
        recipient_email: 'samwel@example.com',
        sender_wallet: seed.wallet.name,
        bundle: { bundle_size: 1 },
      });

    expect(res).to.have.property('statusCode', 201);
    expect(res.body).to.have.property('token_count', 1);
  });

  it('draws the tokens from the named wallet, not the login wallet', async () => {
    // walletB manages walletC, and the only token in walletC is tokenB.
    const issued = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({
        recipient_email: 'samwel@example.com',
        sender_wallet: seed.walletC.name,
        bundle: { bundle_size: 1 },
      });

    expect(issued).to.have.property('statusCode', 201);

    const redeemed = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({ action_token: issued.body.action_token });

    expect(redeemed).to.have.property('statusCode', 200);
    expect(redeemed.body.parameters.tokens).to.include(seed.tokenB.id);
  });

  it('refuses a wallet the caller does not control', async () => {
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({
        recipient_email: 'samwel@example.com',
        sender_wallet: seed.walletC.name,
        bundle: { bundle_size: 1 },
      });

    expect(res).to.have.property('statusCode', 403);
  });

  // walletB controls both itself and walletC, so this gets past the per-token
  // permission check and lands on the sender wallet check.
  it('refuses explicit tokens that the named wallet does not own', async () => {
    const [own] = await seed.addTokenToWallet(seed.walletB.id);

    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({
        recipient_email: 'samwel@example.com',
        sender_wallet: seed.walletC.name,
        tokens: [own.id],
      });

    expect(res).to.have.property('statusCode', 409);
    expect(res.body.message).match(/do not belong to the sender wallet/);
  });
});
