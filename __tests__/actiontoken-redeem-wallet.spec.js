require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const server = require('../server/app');
const seed = require('./seed');

describe('Action token: claiming into a chosen wallet', () => {
  let bearerTokenA;
  let bearerTokenB;
  let link;

  beforeEach(async () => {
    await seed.clear();
    await seed.seed();
    bearerTokenA = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;

    const issued = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({
        recipient_email: 'samwel@example.com',
        bundle: { bundle_size: 1 },
      })
      .expect(201);
    link = issued.body.action_token;
  });

  it('accepts a wallet name, which the app sends on every claim', async () => {
    const res = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: link, wallet: seed.walletB.name });

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('state', 'completed');
  });

  it('puts the tokens in the wallet just created, not the login wallet', async () => {
    const created = await request(server)
      .post('/wallets')
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ wallet: 'walletB-second' })
      .expect(201);

    const redeemed = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: link, wallet: 'walletB-second' })
      .expect(200);

    const moved = redeemed.body.parameters.tokens[0];

    const inNew = await request(server)
      .get(`/tokens?wallet=walletB-second`)
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .expect(200);

    expect(created.body.id).to.exist;
    expect(inNew.body.tokens.map((t) => t.id)).to.include(moved);
  });

  it('still claims into the login wallet when no wallet is named', async () => {
    const res = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: link });

    expect(res).to.have.property('statusCode', 200);
  });

  it('refuses a wallet the account does not own', async () => {
    const res = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: link, wallet: seed.wallet.name });

    expect(res).to.have.property('statusCode', 403);
  });
});
