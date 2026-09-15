
 // Integration test: two share links issued back-to-back must not promise the
 // same token, and issuing over what's left after reservation is rejected (#847)
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const ActionTokenService = require('../server/services/ActionTokenService');

chai.use(require('chai-uuid'));

function decodeTokenIds(actionToken) {
  return ActionTokenService.verifyActionToken(actionToken).token_ids;
}

describe('Action tokens do not double-promise a token', () => {
  let bearerToken;
  let bearerTokenB;
  let bearerTokenC;

  before(async () => {
    await seed.clear();
    await seed.seed();
    bearerToken = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;
    bearerTokenC = seed.walletC.keycloak_account_id;

    await seed.addTokenToWallet(seed.wallet.id);
  });

  let linkOne;
  let linkTwo;

  it(`${seed.wallet.name} (2 tokens) issues two bundle_size:1 links in a row`, async () => {
    const res1 = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ recipient_email: 'r1@example.com', bundle: { bundle_size: 1 } });
    expect(res1).to.have.property('statusCode', 201);
    linkOne = res1.body.action_token;

    const res2 = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ recipient_email: 'r2@example.com', bundle: { bundle_size: 1 } });
    expect(res2).to.have.property('statusCode', 201);
    linkTwo = res2.body.action_token;
  });

  it('the two links carry different token ids', () => {
    const idsOne = decodeTokenIds(linkOne);
    const idsTwo = decodeTokenIds(linkTwo);
    expect(idsOne).to.have.lengthOf(1);
    expect(idsTwo).to.have.lengthOf(1);
    expect(idsOne[0]).to.not.equal(idsTwo[0]);
  });

  it('both recipients can redeem their own link', async () => {
    const redeemB = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: linkOne });
    expect(redeemB).to.have.property('statusCode', 200);

    const redeemC = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenC}`)
      .send({ action_token: linkTwo });
    expect(redeemC).to.have.property('statusCode', 200);
  });

  it('issuing a third link when every token is already redeemed is rejected (409)', async () => {
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ recipient_email: 'r3@example.com', bundle: { bundle_size: 1 } });
    expect(res).to.have.property('statusCode', 409);
  });

  it('requesting an explicit token id already committed to an outstanding link is rejected (409)', async () => {
    await seed.clear();
    await seed.seed();
    const [{ id: tokenTwo }] = await seed.addTokenToWallet(seed.wallet.id);

    const first = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ recipient_email: 'r1@example.com', tokens: [seed.token.id] });
    expect(first).to.have.property('statusCode', 201);

    const second = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        recipient_email: 'r2@example.com',
        tokens: [seed.token.id, tokenTwo],
      });
    expect(second).to.have.property('statusCode', 409);
  });
});
