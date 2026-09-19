
 // Integration test: redeeming into a wallet other than the caller's login
 // wallet, e.g. one just created to claim a share link (#855)
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');

chai.use(require('chai-uuid'));

describe('Redeem an action token into a specific wallet', () => {
  let bearerToken;
  let bearerTokenB;
  let tokenForWalletC;
  let actionTokenForWalletC;
  let secondActionToken;

  before(async () => {
    await seed.clear();
    await seed.seed();
    bearerToken = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;

    [{ id: tokenForWalletC }] = await seed.addTokenToWallet(seed.wallet.id);
  });

  it(`${seed.wallet.name} issues an action token`, async () => {
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        recipient_email: 'samwel@example.com',
        tokens: [tokenForWalletC],
      });
    expect(res).to.have.property('statusCode', 201);
    actionTokenForWalletC = res.body.action_token;
  });

  it(`${seed.walletB.name} redeems into ${seed.walletC.name}, which it manages`, async () => {
    const res = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({
        action_token: actionTokenForWalletC,
        wallet: seed.walletC.name,
      });
    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('state', 'completed');
  });

  it(`the token now belongs to ${seed.walletC.name}, not ${seed.walletB.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${tokenForWalletC}`)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.wallet_id).to.equal(seed.walletC.id);
  });

  it(`${seed.wallet.name} issues another action token`, async () => {
    const [{ id: freshTokenId }] = await seed.addTokenToWallet(seed.wallet.id);
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ recipient_email: 'samwel@example.com', tokens: [freshTokenId] });
    expect(res).to.have.property('statusCode', 201);
    secondActionToken = res.body.action_token;
  });

  it(`${seed.walletB.name} is denied (403) redeeming into a wallet it does not control`, async () => {
    const res = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({
        action_token: secondActionToken,
        wallet: seed.wallet.name,
      });
    expect(res).to.have.property('statusCode', 403);
  });
});
