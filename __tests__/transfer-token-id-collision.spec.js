
 // Integration test: "tokens in this transfer" must return real token ids, not
 // the transaction row's id (#853)
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');

chai.use(require('chai-uuid'));

describe('GET /transfers/:id/tokens returns the real token id', () => {
  let bearerToken;
  let bearerTokenB;
  let completedTransfer;

  before(async () => {
    await seed.clear();
    await seed.seed();
    bearerToken = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;

    const create = await request(server)
      .post('/transfers')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        bundle: { bundle_size: 1 },
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
        claim: false,
      });
    expect(create).to.have.property('statusCode', 202);

    const pending = await request(server)
      .get('/transfers?state=pending&limit=1000')
      .set('Authorization', `Bearer ${bearerTokenB}`);
    const [pendingTransfer] = pending.body.transfers;

    const accept = await request(server)
      .post(`/transfers/${pendingTransfer.id}/accept`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(accept).to.have.property('statusCode', 200);

    const history = await request(server)
      .get('/transfers?limit=1000')
      .set('Authorization', `Bearer ${bearerToken}`);
    [completedTransfer] = history.body.transfers;
  });

  it('lists the token with its own id, not the transaction row id', async () => {
    const res = await request(server)
      .get(`/transfers/${completedTransfer.id}/tokens`)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body.tokens).to.have.lengthOf(1);
    const [token] = res.body.tokens;
    expect(token.id).to.equal(seed.token.id);
  });

  it('the listed token id resolves to a real token', async () => {
    const res = await request(server)
      .get(`/transfers/${completedTransfer.id}/tokens`)
      .set('Authorization', `Bearer ${bearerToken}`);
    const [token] = res.body.tokens;

    const lookup = await request(server)
      .get(`/tokens/${token.id}`)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(lookup).to.have.property('statusCode', 200);
    expect(lookup.body.id).to.equal(token.id);
  });
});
