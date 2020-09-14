/*
 * Only tests the routes that do not alter the database and do not require tokens for now and can
 * add the other tests once we have endpoints that handle deletions and more robust database
 * Substitute personal apiKey in line 22 definition in order to test
 * Start server in terminal with 'npm run server' and run tests with 'npm run test-integration'
 */


const request = require('supertest');
const assert = require ('assert');
const server = require("../server/app");
const { expect } = require('chai');
const seed = require('./seed');
const log = require('loglevel');
log.setLevel('warn');

const mockUser = {
  wallet: seed.entity.wallet,
  password: seed.entity.password,
};

const subWallet = {
  name: 'MyFriendsNewWallet',
};

const apiKey = seed.apiKey;

describe(`Route integration, login [POST /auth] with wallet:${seed.entity.wallet} `, () => {
  let token;

  beforeEach(async () => {
    //before all, seed data to DB
    await seed.clear();
    await seed.seed();

    // Authorizes before each of the follow tests
    const res = await request(server)
      .post('/auth')
      .set('treetracker-api-key', apiKey)
      .send(mockUser);
    expect(res).to.have.property('statusCode', 200);
    token = res.body.token;
    expect(token).to.match(/\S+/);
  });

  afterEach(done => {
    //after finished all the test, clear data from DB
    seed.clear()
      .then(() => {
        done();
      });
  });

  // Authorization path
  it(`[POST /auth] login with wallet:${seed.entity.wallet}`, (done) => {
    request(server)
      .post('/auth')
      .set('treetracker-api-key', apiKey)
      .send(mockUser)
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .end((err, res) => {
        if (err) done(err);
        expect(res.body).to.have.property('token');
        done();
      });
  });

  it(`[GET /token/${seed.token.uuid}] Should be able to get a token `, async () => {
    const res = await request(server)
      .get(`/token/${seed.token.uuid}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${token}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('tokens')
      .that.have.lengthOf(1)
      .that.have.property(0)
      .which.have.property('token', seed.token.uuid);
  });

  // Tests that require logged-in authorization

  // Get trees in user's wallet
  describe('[GET /tree] gets trees from logged in user wallet', () => {

    it(`Should have 1 tree under the wallet:${seed.entity.wallet}`, (done) => {
      request(server)
        .get('/tree')
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
        .end((err, res) => {
          if (err) done(err);
          expect(res.body).to.have.property('trees');
          expect(res.body.trees).to.be.an('array');
          //should have a tree now
          expect(res.body.trees).to.have.lengthOf(1);
          expect(res.body).to.have.property('wallet');
          expect(res.body).to.have.property('wallet_url');
          done();
        });
    });
  });

// Get details of logged in account and sub-accounts
  it(`[GET /account] get account should find the current wallet ${seed.entity.wallet}`, async () => {
    expect(token)
      .to.match(/\S+/);
    let response = await request(server)
      .get('/account')
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${token}`);
    expect(response)
      .to.have.property('statusCode')
      .to.equal(200);
    expect(response.body).to.have.property('accounts');
    expect(response.body.accounts).to.be.an('array');
    expect(response.body)
      .to.have.property('accounts')
      .that.have.property(0)
      .that.to.have.property('wallet', seed.entity.wallet);
  });


  describe(`[POST /account] Create subWallet '${subWallet.name}' under wallet:${seed.entity.wallet}`, () => {

    beforeEach(async () => {
      const res = await request(server)
        .post('/account')
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({
          wallet: subWallet.name,
        });
      expect(res)
        .to.have.property('statusCode', 200);
    });

    it('[GET /account] Should find two accounts now', async () => {
      const res = await request(server)
        .get('/account')
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`);
      expect(res)
        .to.have.property('statusCode', 200);
      expect(res)
        .to.have.property('body')
        .to.have.property('accounts')
        .that.to.have.lengthOf(2);
      expect(res.body.accounts[1])
        .to.have.property('wallet', subWallet.name);
    });

    describe(`[POST /transfer] Now transfer wallet:${seed.entity.wallet}'s token to the new wallet`, () => {

      beforeEach(async () => {
        const res = await request(server)
          .post('/transfer')
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`)
          .send({
            tokens: [seed.token.uuid],
            sender_wallet: seed.entity.wallet,
            receiver_wallet: subWallet.name,
          });
        expect(res)
          .to.have.property('statusCode', 200);
      });

      it('[GET /history] Should be able to find a record about this token in the history API', async () => {
        const res = await request(server)
          .get(`/history?token=${seed.token.uuid}`)
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`);
        expect(res)
          .to.have.property('statusCode', 200);
        expect(res.body)
          .to.have.property('history')
          .to.have.lengthOf(1);
        expect(res.body.history[0])
          .to.have.property('token', seed.token.uuid);
        expect(res.body.history[0])
          .to.have.property('sender_wallet', seed.entity.wallet);
        expect(res.body.history[0])
          .to.have.property('receiver_wallet', subWallet.name);
      });

    });

    describe(`[POST /transfer/bundle] Now bundle transfer wallet:${seed.entity.wallet}'s token to the new wallet`, () => {

      beforeEach(async () => {
        const res = await request(server)
          .post('/transfer/bundle')
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`)
          .send({
            bundle_size: 1,
            sender_wallet: seed.entity.wallet,
            receiver_wallet: subWallet.name,
          });
        expect(res)
          .to.have.property('statusCode', 200);
      });

      it('[GET /history] Should be able to find a record about this token in the history API', async () => {
        const res = await request(server)
          .get(`/history?token=${seed.token.uuid}`)
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`);
        expect(res)
          .to.have.property('statusCode', 200);
        expect(res.body)
          .to.have.property('history')
          .to.have.lengthOf(1);
        expect(res.body.history[0])
          .to.have.property('token', seed.token.uuid);
        expect(res.body.history[0])
          .to.have.property('sender_wallet', seed.entity.wallet);
        expect(res.body.history[0])
          .to.have.property('receiver_wallet', subWallet.name);
      });

    });

    describe(`[POST /send] Now transfer wallet:${seed.entity.wallet}'s token to the new wallet`, () => {

      beforeEach(async () => {
        const res = await request(server)
          .post('/send')
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`)
          .send({
            tokens: [seed.token.uuid],
            receiver_wallet: subWallet.name,
          });
        expect(res)
          .to.have.property('statusCode', 200);
      });

      it('[GET /history] Should be able to find a record about this token in the history API', async () => {
        const res = await request(server)
          .get(`/history?token=${seed.token.uuid}`)
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`);
        expect(res)
          .to.have.property('statusCode', 200);
        expect(res.body)
          .to.have.property('history')
          .to.have.lengthOf(1);
        expect(res.body.history[0])
          .to.have.property('token', seed.token.uuid);
        expect(res.body.history[0])
          .to.have.property('sender_wallet', seed.entity.wallet);
        expect(res.body.history[0])
          .to.have.property('receiver_wallet', subWallet.name);
      });

    });

  });

  /*
  Create a new managed sub-wallet for logged in account

  Don't have an endpoint that handles deletion yet so will only use this test once we have
  that and can undo action in the database

    describe('/account', () => {
      describe('POST', () => {
        it('creates new sub-wallet', (done) => {
          request(server)
            .post('/account')
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${token}`)
            .send(mockWallet)
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .end((err, res) => {
              if (err) done(err);
              expect(res.body).to.have.property('wallet');
              assert(res.body.wallet === 'mockwallet', 'checks name of sub-wallet');
            });
        });
      });
    });

  */

  describe(`wallet:${seed.entity.wallet} request trust relationship with type: send`, () => {

    describe("Request the send-trust-relationship", () => {

      beforeEach(async () => {
        const res = await request(server)
          .post("/trust_relationships")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`)
          .send({
            trust_request_type: 'send',
            wallet: seed.entity.wallet,
          });
        expect(res).property("statusCode").to.eq(200);
      });

      it("Then, some one accept the request; Then we can get the trust", () => {
      });

    });

  });

//  describe("Relationship", () => {
//
//    it("GET /trust_relationships", async () => {
//      const res = await request(server)
//        .get("/trust_relationships")
//        .set('treetracker-api-key', apiKey)
//        .set('Authorization', `Bearer ${token}`);
//      expect(res).property("statusCode").to.eq(200);
//      expect(res).property("body").property("trust_relationships").lengthOf(1);
//      console.warn("body:" , res.body.trust_relationships);
//      expect(res.body.trust_relationships[0]).property("id").a("number");
//    });
//
//
//    describe("Request trust relationship", () => {
//      it("POST /trust_relationships with wrong request type", async () => {
//        const res = await request(server)
//          .post("/trust_relationships")
//          .set('treetracker-api-key', apiKey)
//          .set('Authorization', `Bearer ${token}`)
//          .send({
//            trust_request_type: 'wrongtype',
//            wallet: 'any',
//          });
//        expect(res).property("statusCode").to.eq(400);
//      });
//
//
//
//      it("POST /trust_relationships", async () => {
//        const res = await request(server)
//          .post("/trust_relationships")
//          .set('treetracker-api-key', apiKey)
//          .set('Authorization', `Bearer ${token}`)
//          .send({
//            trust_request_type: 'send',
//            wallet: 'Zaven',
//          });
//        expect(res).property("statusCode").to.eq(200);
//      });
//    });
//
//  });

});

