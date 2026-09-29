require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const server = require('../server/app');
const seed = require('./seed');

function decode(actionToken) {
  const part = actionToken.split('.')[1];
  return JSON.parse(Buffer.from(part, 'base64url').toString());
}

describe('Action token: a bundle link promises a count, not named tokens', () => {
  let bearerTokenA;
  let bearerTokenB;

  beforeEach(async () => {
    await seed.clear();
    await seed.seed();
    bearerTokenA = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;
  });

  async function issueBundleLink(size) {
    const res = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({
        recipient_email: 'samwel@example.com',
        bundle: { bundle_size: size },
      });
    expect(res).to.have.property('statusCode', 201);
    return res.body.action_token;
  }

  it('carries a count and names no tokens', async () => {
    const payload = decode(await issueBundleLink(1));

    expect(payload).to.have.property('token_count', 1);
    expect(payload).to.not.have.property('token_ids');
  });

  it('survives the sender spending the token it would have named', async () => {
    const link = await issueBundleLink(1);
    const [spare] = await seed.addTokenToWallet(seed.wallet.id);

    await request(server)
      .post('/transfers')
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({
        tokens: [seed.token.id],
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
      })
      .expect(202);

    const redeemed = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: link });

    expect(redeemed).to.have.property('statusCode', 200);
    expect(redeemed.body.parameters.tokens).eql([spare.id]);
  });

  it('refuses when the wallet has dropped below the promised count', async () => {
    const link = await issueBundleLink(1);

    await request(server)
      .post('/transfers')
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({
        tokens: [seed.token.id],
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
      })
      .expect(202);

    const redeemed = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: link });

    expect(redeemed).to.have.property('statusCode', 409);
    expect(redeemed.body.message).match(/does not have 1 tokens available/);
  });

  it('still claims a link that names its tokens', async () => {
    const issued = await request(server)
      .post('/action-tokens')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .send({
        recipient_email: 'samwel@example.com',
        tokens: [seed.token.id],
      })
      .expect(201);

    expect(decode(issued.body.action_token)).to.have.property('token_ids');

    const redeemed = await request(server)
      .post('/action-tokens/redeem')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({ action_token: issued.body.action_token });

    expect(redeemed).to.have.property('statusCode', 200);
    expect(redeemed.body.parameters.tokens).to.include(seed.token.id);
  });
});
