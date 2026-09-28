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

  it('accepts a second wallet of the same account, with no trust row', async () => {
    const created = await request(server)
      .post('/wallets')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .set('content-type', 'application/json')
      .send({ wallet: 'walletA-second' })
      .expect(201);

    const [own] = await seed.addTokenToWallet(created.body.id);

    const issued = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({
        recipient_email: 'samwel@example.com',
        sender_wallet: 'walletA-second',
        bundle: { bundle_size: 1 },
      });

    expect(issued).to.have.property('statusCode', 201);

    const redeemed = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: issued.body.action_token });

    expect(redeemed).to.have.property('statusCode', 200);
    expect(redeemed.body.parameters.tokens).to.include(own.id);
  });

  it('draws the tokens from the named wallet, not the login wallet', async () => {
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
