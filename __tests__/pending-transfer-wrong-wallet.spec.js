require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
chai.use(require('chai-uuid'));

describe('Create and fail to accept a pending transfer with wrong wallet', () => {
  let bearerToken;
  let bearerTokenB;
  let bearerTokenC;

  before(async () => {
    await seed.clear();
    await seed.seed();

    {
      // Authorizes before each of the follow tests
      const res = await request(server)
        .post('/auth')
        .send({
          wallet: seed.wallet.name,
          password: seed.wallet.password,
        });
      expect(res).to.have.property('statusCode', 200);
      bearerToken = res.body.token;
      expect(bearerToken).to.match(/\S+/);
    }

    {
      // Authorizes before each of the follow tests
      const res = await request(server)
        .post('/auth')
        .send({
          wallet: seed.walletB.name,
          password: seed.walletB.password,
        });
      expect(res).to.have.property('statusCode', 200);
      bearerTokenB = res.body.token;
      expect(bearerTokenB).to.match(/\S+/);
    }

    {
      const res = await request(server)
        .post('/auth')
        .send({
          wallet: seed.walletC.name,
          password: seed.walletC.password,
        });
      expect(res).to.have.property('statusCode', 200);
      expect(res).property('body').property('token').a('string');
      bearerTokenC = res.body.token;
    }
  });

  beforeEach(async () => {
    sinon.restore();
  });

  let transferId;

  it(`Creates a pending transaction `, async () => {
    const res = await request(server)
      .post('/transfers')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tokens: [seed.token.id],
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
      });
    expect(res).property('statusCode').to.eq(202);
    expect(res).property('body').property('id').to.be.a.uuid('v4');
    expect(res)
      .property('body')
      .property('parameters')
      .property('tokens')
      .lengthOf(1);
    expect(res.body.parameters.tokens[0]).eq(seed.token.id);
    transferId = res.body.id;
  });

  it(`${seed.walletC.name} should not be able to accept the transfer (403)`, async () => {
    expect(transferId).a('string');
    const res = await request(server)
      .post(`/transfers/${transferId}/accept`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenC}`);
    expect(res).to.have.property('statusCode', 403);
    expect(res)
      .property('body')
      .property('message')
      .match(/permission/i);
  });
});
