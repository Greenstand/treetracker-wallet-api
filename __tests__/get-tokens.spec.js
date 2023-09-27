/*
 * The integration test to test the whole business, with DB
 */
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const seed = require('./seed');
const server = require('../server/app');
chai.use(require('chai-uuid'));

describe('GET tokens', () => {
  let bearerToken;
  let bearerTokenB;

  beforeEach(async () => {
    await seed.clear();
    await seed.seed();
    sinon.restore();

    {
      // Authorizes before each of the follow tests
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', seed.apiKey)
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
        .set('treetracker-api-key', seed.apiKey)
        .send({
          wallet: seed.walletB.name,
          password: seed.walletB.password,
        });
      expect(res).to.have.property('statusCode', 200);
      bearerTokenB = res.body.token;
      expect(bearerTokenB).to.match(/\S+/);
    }
  });

  it(`walletA, GET /tokens/${seed.token.id} Should be able to get a token `, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('id').eq(seed.token.id);
  });

  it(`walletA, GET /tokens/${seed.tokenB.id} Should be forbidden`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.tokenB.id}`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 403);
  });

  it(`walletA, GET /tokens Should be able to get a token `, async () => {
    const res = await request(server)
      .get(`/tokens?limit=10`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.tokens[0]).to.have.property('id').eq(seed.token.id);
  });

  it(`walletB, GET /tokens Should be able to get a token, which actually belongs to walletC`, async () => {
    const res = await request(server)
      .get(`/tokens?limit=10&wallet=walletC`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.tokens[0]).to.have.property('id').eq(seed.tokenB.id);
  });

  it(`walletB, GET /tokens/${seed.tokenB.id} Should be able to get a token `, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.tokenB.id}`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('id').eq(seed.tokenB.id);
  });
  it(`GET /tokens/ should return correct limit`, async () => {
    await seed.addTokenToWallet(seed.wallet.id);
    const res = await request(server)
      .get(`/tokens?limit=1`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body.tokens.length).to.eq(1);
    expect(res.body.tokens[0].id).eq(seed.token.id);
  });

  it(`GET /tokens/ should return correct offset`, async () => {
    const insertedId = (await seed.addTokenToWallet(seed.wallet.id))[0].id;
    const res = await request(server)
      .get(`/tokens?offset=1&limit=10`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body.tokens.length).to.eq(1);
    expect(res.body.tokens[0].id).eq(insertedId);
  });
});
