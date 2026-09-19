
 // Integration test: list and revoke issued action tokens (share links), #846
 // Auth: Bearer is the wallet's keycloak_account_id (JWTService.verify stubbed by mocks.js)
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');

chai.use(require('chai-uuid'));

describe('List and revoke action tokens', () => {
  let bearerToken;
  let bearerTokenB;
  let cancelledToken;
  let cancelledId;
  let redeemableToken;
  let redeemableId;
  let subWalletLinkId;

  before(async () => {
    await seed.clear();
    await seed.seed();
    bearerToken = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;
  });

  it(`${seed.wallet.name} issues an action token`, async () => {
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ recipient_email: 'samwel@example.com', tokens: [seed.token.id] });

    expect(res).to.have.property('statusCode', 201);
    expect(res.body).to.have.property('id').that.is.a.uuid('v4');
    cancelledToken = res.body.action_token;
    cancelledId = res.body.id;
  });

  it(`${seed.wallet.name} sees the issued link in the list as active`, async () => {
    const res = await request(server)
      .get('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('total').that.is.at.least(1);
    const link = res.body.action_tokens.find((a) => a.id === cancelledId);
    expect(link).to.include({ state: 'active', token_count: 1 });
  });

  it(`${seed.wallet.name} cancels the link`, async () => {
    const res = await request(server)
      .delete(`/action-tokens/${cancelledId}`)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.include({ id: cancelledId, state: 'cancelled' });
  });

  it(`the cancelled link now lists as cancelled`, async () => {
    const res = await request(server)
      .get('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`);

    const link = res.body.action_tokens.find((a) => a.id === cancelledId);
    expect(link).to.have.property('state', 'cancelled');
  });

  it(`${seed.walletB.name} is denied (409) when redeeming a cancelled link`, async () => {
    const res = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: cancelledToken });

    expect(res).to.have.property('statusCode', 409);
  });

  it(`the token still belongs to ${seed.wallet.name} after cancel`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 200);
  });

  it(`cancelling an already-cancelled link is rejected (409)`, async () => {
    const res = await request(server)
      .delete(`/action-tokens/${cancelledId}`)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 409);
  });

  it(`${seed.wallet.name} issues a fresh link that ${seed.walletB.name} redeems`, async () => {
    const issue = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ recipient_email: 'samwel@example.com', tokens: [seed.token.id] });
    expect(issue).to.have.property('statusCode', 201);
    redeemableToken = issue.body.action_token;
    redeemableId = issue.body.id;

    const redeem = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: redeemableToken });
    expect(redeem).to.have.property('statusCode', 200);
    expect(redeem.body).to.have.property('state', 'completed');
  });

  it(`the redeemed link lists as redeemed`, async () => {
    const res = await request(server)
      .get('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`);

    const link = res.body.action_tokens.find((a) => a.id === redeemableId);
    expect(link).to.have.property('state', 'redeemed');
    expect(link).to.have.property('redeemed_at').that.is.not.null;
  });

  it(`redeeming an already-redeemed link is denied (409)`, async () => {
    const res = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: redeemableToken });

    expect(res).to.have.property('statusCode', 409);
  });
  it(`${seed.walletB.name} issues a link from ${seed.walletC.name}, a wallet it manages`, async () => {
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({
        recipient_email: 'samwel@example.com',
        sender_wallet: seed.walletC.name,
        tokens: [seed.tokenB.id],
      });

    expect(res).to.have.property('statusCode', 201);
    subWalletLinkId = res.body.id;
  });

  it(`${seed.walletB.name} sees the ${seed.walletC.name} link in its own list`, async () => {
    const res = await request(server)
      .get('/action-tokens')
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(res).to.have.property('statusCode', 200);
    const link = res.body.action_tokens.find((a) => a.id === subWalletLinkId);
    expect(link).to.include({
      state: 'active',
      sender_wallet_id: seed.walletC.id,
    });
  });

  it(`${seed.wallet.name} neither sees nor cancels the ${seed.walletC.name} link`, async () => {
    const list = await request(server)
      .get('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(list).to.have.property('statusCode', 200);
    expect(
      list.body.action_tokens.find((a) => a.id === subWalletLinkId),
    ).to.equal(undefined);

    const cancel = await request(server)
      .delete(`/action-tokens/${subWalletLinkId}`)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(cancel).to.have.property('statusCode', 404);
  });

  it(`${seed.walletB.name} cancels the ${seed.walletC.name} link`, async () => {
    const res = await request(server)
      .delete(`/action-tokens/${subWalletLinkId}`)
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.include({ id: subWalletLinkId, state: 'cancelled' });
  });
});
