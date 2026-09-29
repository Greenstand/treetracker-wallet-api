// Integration test: a signed-in account with no wallet is not an auth failure.
// 401 stays reserved for a token that is genuinely bad or expired.
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const uuid = require('uuid');
const server = require('../server/app');
const seed = require('./seed');

chai.use(require('chai-uuid'));

describe('An account with no wallet yet', () => {
  // A keycloak id no wallet row points at: the token verifies, the wallet
  // lookup finds nothing.
  const strangerToken = uuid.v4();

  before(async () => {
    await seed.clear();
    await seed.seed();
  });

  it('GET /wallets answers 409 with reason no_wallet', async () => {
    const res = await request(server)
      .get('/wallets')
      .set('Authorization', `Bearer ${strangerToken}`);

    expect(res).to.have.property('statusCode', 409);
    expect(res.body).to.have.property('reason', 'no_wallet');
    expect(res.body.message).to.match(/no wallet yet/);
  });

  it('redeeming a share link answers 409 with reason no_wallet', async () => {
    const link = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${seed.wallet.keycloak_account_id}`)
      .send({
        recipient_email: 'samwel@example.com',
        bundle: { bundle_size: 1 },
        sender_wallet: seed.wallet.name,
      });
    expect(link).to.have.property('statusCode', 201);

    const res = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ action_token: link.body.action_token });

    expect(res).to.have.property('statusCode', 409);
    expect(res.body).to.have.property('reason', 'no_wallet');
  });

  it('POST /wallets is still allowed, so the account can get one', async () => {
    const res = await request(server)
      .post('/wallets')
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ wallet: 'no-wallet-account-test', about: 'a new wallet' });

    expect(res.statusCode).to.be.oneOf([200, 201]);
  });

  it('an account that has a wallet is unaffected', async () => {
    const res = await request(server)
      .get('/wallets')
      .set('Authorization', `Bearer ${seed.wallet.keycloak_account_id}`);

    expect(res).to.have.property('statusCode', 200);
  });
});
