require('dotenv').config()
const request = require('supertest');
const { expect } = require('chai');
const log = require('loglevel');
const sinon = require("sinon");
const chai = require("chai");
const server = require("../server/app");
const seed = require('./seed');
const Transfer = require("../server/models/Transfer");
const TrustRelationship = require("../server/models/TrustRelationship");
chai.use(require('chai-uuid'));

const {apiKey} = seed;

describe('Create and accept a bundle transfer', () => {

  let bearerToken;
  let bearerTokenB;
  let pendingTransfer;

  before( async () => {

    await seed.clear();
    await seed.seed();

    {
      // Authorizes before each of the follow tests
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', apiKey)
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
        .set('treetracker-api-key', apiKey)
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


  it(`create Bundle transfer tokens from ${seed.wallet.name} to ${seed.walletB.name}`, async () => {
    const res = await request(server)
      .post("/transfers")
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        bundle: {
          bundle_size: 1,
        },
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletB.name,
        claim: false,
      });
    expect(res).property("statusCode").to.eq(202);
    expect(res).property("body").property("parameters").property("bundle").property("bundleSize").eq(1);
  })


  it("get all pending transfers belongs to walletB, should have one", async () => {
    const res = await request(server)
      .get('/transfers?state=pending&limit=1000')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.transfers).lengthOf(1);
    pendingTransfer = res.body.transfers[0];
    expect(pendingTransfer).property("destination_wallet").eq(seed.walletB.name);
  })

  it("Decline the pending transfer", async () => {
    const res = await request(server)
      .post(`/transfers/${pendingTransfer.id}/decline`)
      .set('Content-Type', "application/json")
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    console.log(res.body)
    expect(res).to.have.property('statusCode', 200);
  })

  it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be cancelled`, async () => {
    const res = await request(server)
      .get(`/transfers?limit=1000`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.transfers).lengthOf(1);
    expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.cancelled);
  });

  it(`Token:#${seed.token.id} now should still belong to ${seed.wallet.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.wallet_id).eq(seed.wallet.id);
  });
});
