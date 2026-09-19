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

  // The web always names the wallet to share from (#869). A login that
  // manages a sub-wallet must not get the same sub-wallet token in two links,
  // whichever wallet it names as sender, and cancelling a link must release
  // its token again.
  describe('links issued from a managed sub-wallet', () => {
    let firstLinkId;
    let firstLinkTokenIds;
    let tokenC2;

    before(async () => {
      await seed.clear();
      await seed.seed();
      [{ id: tokenC2 }] = await seed.addTokenToWallet(seed.walletC.id);
    });

    it(`${seed.walletB.name} issues two bundle_size:1 links from ${seed.walletC.name}: different token ids, sender is ${seed.walletC.name}`, async () => {
      const first = await request(server)
        .post('/action-tokens')
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({
          recipient_email: 'r1@example.com',
          sender_wallet: seed.walletC.name,
          bundle: { bundle_size: 1 },
        });
      expect(first).to.have.property('statusCode', 201);
      firstLinkId = first.body.id;
      firstLinkTokenIds = decodeTokenIds(first.body.action_token);

      const second = await request(server)
        .post('/action-tokens')
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({
          recipient_email: 'r2@example.com',
          sender_wallet: seed.walletC.name,
          bundle: { bundle_size: 1 },
        });
      expect(second).to.have.property('statusCode', 201);
      const secondTokenIds = decodeTokenIds(second.body.action_token);

      expect(firstLinkTokenIds).to.have.lengthOf(1);
      expect(secondTokenIds).to.have.lengthOf(1);
      expect([...firstLinkTokenIds, ...secondTokenIds].sort()).to.eql(
        [seed.tokenB.id, tokenC2].sort(),
      );
      expect(
        ActionTokenService.verifyActionToken(first.body.action_token)
          .sender_wallet_id,
      ).to.equal(seed.walletC.id);
    });

    it(`a third link from ${seed.walletC.name} is rejected while both tokens are promised (409)`, async () => {
      const res = await request(server)
        .post('/action-tokens')
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({
          recipient_email: 'r3@example.com',
          sender_wallet: seed.walletC.name,
          bundle: { bundle_size: 1 },
        });
      expect(res).to.have.property('statusCode', 409);
    });

    it(`${seed.walletB.name} naming no sender but asking explicitly for a promised ${seed.walletC.name} token is rejected (409)`, async () => {
      const res = await request(server)
        .post('/action-tokens')
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({ recipient_email: 'r3@example.com', tokens: [seed.tokenB.id] });
      expect(res).to.have.property('statusCode', 409);
    });

    it('cancelling the first link releases its token to the next link', async () => {
      const cancel = await request(server)
        .delete(`/action-tokens/${firstLinkId}`)
        .set('Authorization', `Bearer ${bearerTokenB}`);
      expect(cancel).to.have.property('statusCode', 200);
      expect(cancel.body).to.have.property('state', 'cancelled');

      const res = await request(server)
        .post('/action-tokens')
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({
          recipient_email: 'r4@example.com',
          sender_wallet: seed.walletC.name,
          bundle: { bundle_size: 1 },
        });
      expect(res).to.have.property('statusCode', 201);
      expect(decodeTokenIds(res.body.action_token)).to.eql(firstLinkTokenIds);
    });
  });
});
