/*
 * The integration test to test the whole business, with DB
 */
require('dotenv').config()
const request = require('supertest');
const server = require("../server/app");
const { expect } = require('chai');
const seed = require('./seed');
const log = require('loglevel');
const Transfer = require("../server/models/Transfer");
const TrustRelationship = require("../server/models/TrustRelationship");
const sinon = require("sinon");
const chai = require("chai");
chai.use(require('chai-uuid'));

describe('GET tokens', () => {
  let bearerToken;
  let bearerTokenB;

  before( async () => {

    await seed.clear();
    await seed.seed();

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

  beforeEach(async () => {
    sinon.restore();
  })

  it(`walletA, GET /tokens/${seed.token.id} Should be able to get a token `, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('treetracker-api-key',seed.apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('id').eq(seed.token.id);
  });

  it(`walletA, GET /tokens/${seed.tokenB.id} Should be forbidden`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.tokenB.id}`)
      .set('treetracker-api-key',seed.apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 401);
  });

  it(`walletA, GET /tokens Should be able to get a token `, async () => {
    const res = await request(server)
      .get(`/tokens?limit=10`)
      .set('treetracker-api-key',seed.apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.tokens[0]).to.have.property('id').eq(seed.token.id);
  });

  it(`walletB, GET /tokens Should be able to get a token, which actually belongs to walletC`, async () => {
    const res = await request(server)
      .get(`/tokens?limit=10&wallet=walletC`)
      .set('treetracker-api-key',seed.apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.tokens[0]).to.have.property('id').eq(seed.tokenB.id);
  });

  it(`walletB, GET /tokens?limit=10&wallet=walletC&start=2 Should be able to get a token, which length 0`, async () => {
    const res = await request(server)
      .get(`/tokens?limit=10&wallet=walletC`)
      .set('treetracker-api-key',seed.apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.tokens).lengthOf(0);
  });

  it(`walletB, GET /tokens?limit=10&wallet=walletC&start=1 Should be able to get a token, which length 1`, async () => {
    const res = await request(server)
      .get(`/tokens?limit=10&wallet=walletC`)
      .set('treetracker-api-key',seed.apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.tokens).lengthOf(1);
  });

  it(`walletB, GET /tokens/${seed.tokenB.id} Should be able to get a token `, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.tokenB.id}`)
      .set('treetracker-api-key',seed.apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('id').eq(seed.tokenB.id);
  });
});
