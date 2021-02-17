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

const mockUser = {
  wallet: seed.wallet.name,
  password: seed.wallet.password,
};

const newWallet = {
  name: 'MyFriendsNewWallet',
};

const apiKey = seed.apiKey;

describe('Wallet integration tests', () => {
  let bearerToken;
  let bearerTokenB;

  before( async () => {
    
    //   //before all, seed data to DB
    await seed.clear();
    await seed.seed();


  }

  beforeEach(async () => {
    //In case other sinon stub would affect me 
    sinon.restore();
     {
      // Authorizes before each of the follow tests
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', apiKey)
        .send(mockUser);
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

  afterEach(done => {
    //after finished all the test, clear data from DB
    done()
  /*  seed.clear()
      .then(() => {
        done();
      });
      */
      
  });

  // Authorization path
  it(`[POST /auth] login with ${seed.wallet.name}`, (done) => {
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


  it(`[POST /auth] login with using wallet id: ${seed.wallet.id}`, (done) => {
    request(server)
      .post('/auth')
      .set('treetracker-api-key', apiKey)
      .send({wallet: seed.wallet.id, password: seed.wallet.password})
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .end((err, res) => {
        if (err) done(err);
        expect(res.body).to.have.property('token');
        done();
      });
  });

  describe("Check default tokens", () => {

    beforeEach(async () => {
      await seed.clear();
      await seed.seed();
    })

    it(`walletA, GET /tokens/${seed.token.id} Should be able to get a token `, async () => {
      const res = await request(server)
        .get(`/tokens/${seed.token.id}`)
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerToken}`);
      console.log('LLL')
      console.log(res.body)
      expect(res).to.have.property('statusCode', 200);
      expect(res.body).to.have.property('id').eq(seed.token.id);
    });

    it(`walletA, GET /tokens/${seed.tokenB.id} Should be forbidden`, async () => {
      const res = await request(server)
        .get(`/tokens/${seed.tokenB.id}`)
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerToken}`);
      expect(res).to.have.property('statusCode', 401);
    });

    it(`walletA, GET /tokens Should be able to get a token `, async () => {
      const res = await request(server)
        .get(`/tokens?limit=10`)
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerToken}`);
      expect(res).to.have.property('statusCode', 200);
      expect(res.body.tokens[0]).to.have.property('id').eq(seed.token.id);
    });

    it(`walletB, GET /tokens Should be able to get a token, which actually belongs to walletC`, async () => {
      const res = await request(server)
        .get(`/tokens?limit=10&wallet=walletC`)
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`);
      expect(res).to.have.property('statusCode', 200);
      expect(res.body.tokens[0]).to.have.property('id').eq(seed.tokenB.id);
    });

    it(`walletB, GET /tokens/${seed.tokenB.id} Should be able to get a token `, async () => {
      const res = await request(server)
        .get(`/tokens/${seed.tokenB.id}`)
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`);
      expect(res).to.have.property('statusCode', 200);
      expect(res.body).to.have.property('id').eq(seed.tokenB.id);
    });
  });

  describe.skip(`Before request trust, try to send token:#${seed.token.id} from ${seed.wallet.name} to ${seed.walletB.name} should be pending (202)`, () => {


    let transferId;

    beforeEach(async () => {
      await seed.clear();
      await seed.seed();

      const res = await request(server)
        .post("/transfers")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({
          tokens: [seed.token.id],
          sender_wallet: seed.wallet.name,
          receiver_wallet: seed.walletB.name,
        });
      expect(res).property("statusCode").to.eq(202);
      expect(res).property("body").property("id").to.be.a.uuid('v4')
      expect(res).property("body").property("parameters").property("tokens").lengthOf(1);
      expect(res.body.parameters.tokens[0]).eq(seed.token.id);
      transferId = res.body.id;
    })

    it(`Token:#${seed.token.id} now should be pending `, async () => {
      const res = await request(server)
        .get(`/tokens/${seed.token.id}`)
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerToken}`);
      expect(res).to.have.property('statusCode', 200);
      expect(res.body.transfer_pending).eq(true);
    });

    describe(`with ${seed.walletB.name}`, () => {

      describe("Get all pending transfers belongs to walletB, should have one", () => {
        let pendingTransfer;

        beforeEach(async () => {
          const res = await request(server)
            .get(`/transfers?state=pending&wallet=${seed.wallet.name}&limit=1000`)
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerTokenB}`);
          expect(res).to.have.property('statusCode', 200);
          expect(res.body.transfers).lengthOf(1);
          pendingTransfer = res.body.transfers[0];
          expect(pendingTransfer).property("destination_wallet").eq(seed.walletB.name);
        })

        describe("Accept the pending transfer", () => {

          beforeEach(async () => {
            const res = await request(server)
              .post(`/transfers/${pendingTransfer.id}/accept`)
              .set('Content-Type', "application/json")
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${bearerTokenB}`);
            expect(res).to.have.property('statusCode', 200);
          })

          it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be completed 1`, async () => {
            const res = await request(server)
              .get(`/transfers?limit=1000`)
              .set('treetracker-api-key', apiKey)
              .set('Content-Type', "application/json")
              .set('Authorization', `Bearer ${bearerToken}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfers).lengthOf(1);
            expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.completed);
          });

          it(`Token:#${seed.token.id} now should belong to ${seed.walletB.name}`, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.id}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${bearerTokenB}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.wallet_id).eq(seed.walletB.id);
          });

          it(`Token:#${seed.token.id} now should have some transaction history`, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.id}/transactions?limit=1000`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${bearerTokenB}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.history).lengthOf(1);
            expect(res.body.history[0]).property("token").eq(seed.token.id);
            expect(res.body.history[0]).property("sender_wallet").eq(seed.wallet.name);
            expect(res.body.history[0]).property("receiver_wallet").eq(seed.walletB.name);
          });
        });

        describe("Decline the pending transfer", () => {

          beforeEach(async () => {
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

          it(`Token:#${seed.token.id} now shouldn't be pending `, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.id}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${bearerToken}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfer_pending).eq(false);
          });

        });

        describe("Delete/cancel the pending transfer", () => {

          beforeEach(async () => {
            const res = await request(server)
              .del(`/transfers/${pendingTransfer.id}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${bearerToken}`);
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

          it(`Token:#${seed.token.id} now shouldn't be pending `, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.id}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${bearerToken}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfer_pending).eq(false);
          });
        });

      });

    });

    describe("Login with ${seed.walletC.name}", () => {
      let bearerTokenC;

      beforeEach(async () => {
        await seed.clear();
        await seed.seed();

        const res = await request(server)
          .post('/auth')
          .set('treetracker-api-key', apiKey)
          .send({
            wallet: seed.walletC.name,
            password: seed.walletC.password,
          });
        expect(res).to.have.property('statusCode', 200);
        expect(res).property('body').property("token").a("string");
        bearerTokenC = res.body.token;
      })

      it(`${seed.walletC.name} should not be able to accept the transfer (403)`, async () => {
        const res = await request(server)
          .post(`/transfers/${transferId}/accept`)
          .set('Content-Type', "application/json")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerTokenC}`);
        expect(res).to.have.property('statusCode', 403);
        expect(res).property("body").property("message").match(/permission/i);
      });
    });

    describe(`${seed.wallet.name} request "send" trust relationship with ${seed.walletB.name} `, () => {
      let trustRelationship;

      beforeEach(async () => {
        await seed.clear();
        await seed.seed();

        const res = await request(server)
          .post("/trust_relationships")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerToken}`)
          .send({
            trust_request_type: 'send',
            requestee_wallet: seed.walletB.name,
          });
        expect(res).property("statusCode").to.eq(200);
        trustRelationship = res.body;
        expect(trustRelationship).property("id").to.be.a.uuid('v4')
        expect(trustRelationship).property("state").eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested);
      });


      describe("Accept this request", () => {

        beforeEach(async () => {
          const res = await request(server)
            .post(`/trust_relationships/${trustRelationship.id}/accept`)
            .set('Content-Type', "application/json")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerTokenB}`);
          expect(res).property("statusCode").to.eq(200);
        })

        it("Wallet should be able to find the relationship, and it was approved", async () => {
          const res = await request(server)
            .get("/trust_relationships?limit=1000")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerToken}`);
          expect(res).property("statusCode").to.eq(200);
          expect(res).property("body").property("trust_relationships").lengthOf(1);
          expect(res.body.trust_relationships[0]).property("id").to.be.a.uuid('v4')
        });

        it("Try to send a token to walletB again, this time, should success, 201", async () => {
          const res = await request(server)
            .post("/transfers")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerToken}`)
            .send({
              tokens: [],
              sender_wallet: seed.wallet.name,
              receiver_wallet: seed.walletB.name,
            });
          expect(res).property("statusCode").to.eq(201);
          expect(res).property("body").property("parameters").property("tokens").lengthOf(0);
        });

        it("Try to send bundle token to walletB again, should success, 201", async () => {
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
            });
          expect(res).property("statusCode").to.eq(201);
        });
      });

      describe("Decline this request", () => {

        beforeEach(async () => {
          const res = await request(server)
            .post(`/trust_relationships/${trustRelationship.id}/decline`)
            .set('Content-Type', "application/json")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerTokenB}`);
          expect(res).property("statusCode").to.eq(200);
        })

        it("Wallet should be able to find the relationship, and it was cancelled", async () => {
          const res = await request(server)
            .get("/trust_relationships?limit=1000")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerToken}`);
          expect(res).property("statusCode").to.eq(200);
          expect(res).property("body").property("trust_relationships").lengthOf(1);
          expect(res.body.trust_relationships[0]).property("id").to.be.a.uuid('v4')
          expect(res.body.trust_relationships[0]).property("state").eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.canceled_by_target);
        });

      });

      describe(`Cancel this request by ${seed.wallet.name}`, () => {

        beforeEach(async () => {
          const res = await request(server)
            .del(`/trust_relationships/${trustRelationship.id}`)
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerToken}`);
          expect(res).property("statusCode").to.eq(200);
        })

        it("Wallet should be able to find the relationship, and it was cancelled", async () => {
          const res = await request(server)
            .get("/trust_relationships?limit=1000")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerToken}`);
          expect(res).property("statusCode").to.eq(200);
          expect(res).property("body").property("trust_relationships").lengthOf(1);
          expect(res.body.trust_relationships[0]).property("id").to.be.a.uuid('v4')
          expect(res.body.trust_relationships[0]).property("state").eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.cancelled_by_originator);
        });

      });
    });
  });

  describe(`Bundle transfer tokens from ${seed.wallet.name} to ${seed.walletB.name}`, () => {

    beforeEach(async () => {
      await seed.clear();
      await seed.seed();
    })

    // TODO: this should be created in the seed
    beforeEach(async () => {
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
        });
      expect(res).property("statusCode").to.eq(202);
      expect(res).property("body").property("parameters").property("bundle").property("bundleSize").eq(1);
    })


    describe("get all pending transfers belongs to walletB, should have one", () => {
      let pendingTransfer;

      beforeEach(async () => {
        const res = await request(server)
          .get('/transfers?state=pending&limit=1000')
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${tokenB}`);
        console.log('LL1')
        console.log(res.body)
        console.log(res.statusCode)
        console.log('LL2')
        expect(res).to.have.property('statusCode', 200);
        expect(res.body.transfers).lengthOf(1);
        pendingTransfer = res.body.transfers[0];
        expect(pendingTransfer).property("destination_wallet").eq(seed.walletB.name);
      })

      describe("Accept the pending transfer", () => {

        beforeEach(async () => {
          const res = await request(server)
            .post(`/transfers/${pendingTransfer.id}/accept`)
            .set('Content-Type', "application/json")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerTokenB}`);
          expect(res).to.have.property('statusCode', 200);
        })

        it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be completed 2`, async () => {
          const res = await request(server)
            .get(`/transfers?limit=1000`)
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerToken}`);
          console.log(res.body)
          expect(res).to.have.property('statusCode', 200);
          expect(res.body.transfers).lengthOf(1);
          expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.completed);
        });

        it(`Token:#${seed.token.id} now should belong to ${seed.walletB.name}`, async () => {
          const res = await request(server)
            .get(`/tokens/${seed.token.id}`)
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerTokenB}`);
          expect(res).to.have.property('statusCode', 200);
          expect(res.body.wallet_id).eq(seed.walletB.id);
        });
      });

      describe("Decline the pending transfer", () => {

        beforeEach(async () => {
          const res = await request(server)
            .post(`/transfers/${pendingTransfer.id}/decline`)
            .set('Content-Type', "application/json")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${tokenB}`);
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

      describe("Delete/cancel the pending transfer", () => {

        beforeEach(async () => {
          const res = await request(server)
            .del(`/transfers/${pendingTransfer.id}`)
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerToken}`);
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
      });

    });

  });


  describe(`request a transfer and fulfill it`, () => {

    before(async () => {
      await seed.clear();
      await seed.seed();
    })

    let requestedTransferId;

    it(`WalletB:${seed.walletB.name} request a token from ${seed.wallet.name}, should get 202`, async () => {

      const res = await request(server)
        .post("/transfers")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({
          tokens: [seed.token.id],
          sender_wallet: seed.wallet.name,
          receiver_wallet: seed.walletB.name,
        });
      console.log('AA')
      console.log(res.body)
      expect(res).property("statusCode").to.eq(202);

    })

    it(`${seed.wallet.name} should find a requested transfer sent to him`, async () => {

      const res = await request(server)
        .get("/transfers?state=requested&limit=1000")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerToken}`);
      expect(res).property("statusCode").to.eq(200);
      expect(res.body).property("transfers").lengthOf(1);
      expect(res.body.transfers[0]).property("state").eq("requested");
      expect(res.body.transfers[0]).property("id").to.be.a.uuid('v4');
      requestedTransferId = res.body.transfers[0].id;
      console.log('JJ')
      console.log(requestedTransferId)

    })

    it(`${seed.wallet.name} fulfill this requested transfer`, async () => {

      console.log(requestedTransferId)
      const res = await request(server)
        .post(`/transfers/${requestedTransferId}/fulfill`)
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({
          implicit: true,
        });
      console.log(res.body)
      expect(res).property("statusCode").to.eq(200);

    })

    it(`${seed.walletB.name} should be able to find requested transfer has been completed`, async () => {

      const res = await request(server)
        .get("/transfers?state=completed&limit=1000")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`);
      expect(res).property("statusCode").to.eq(200);
      expect(res.body).property("transfers").lengthOf(1);
      expect(res.body.transfers[0]).property("state").eq("completed");
      expect(res.body.transfers[0]).property("id").eq(requestedTransferId);

    });

    it(`Token:#${seed.token.id} now should still belong to ${seed.walletB.name}`, async () => {

      const res = await request(server)
        .get(`/tokens/${seed.token.id}`)
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`);
      expect(res).to.have.property('statusCode', 200);
      expect(res.body.wallet_id).eq(seed.walletB.id);

    });
  });

  describe(`WalletB:${seed.walletB.name} request a bundle of token from ${seed.wallet.name}, should get 202`, () => {

    beforeEach(async () => {
      await seed.clear();
      await seed.seed();

      const res = await request(server)
        .post("/transfers")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({
          bundle: {
            bundle_size: 1,
          },
          sender_wallet: seed.wallet.name,
          receiver_wallet: seed.walletB.name,
        });
      expect(res).property("statusCode").to.eq(202);
    })

    describe(`${seed.wallet.name} should find a requested transfer sent to him`, () => {
      let requestedTransferId;

      beforeEach(async () => {
        const res = await request(server)
          .get("/transfers?state=requested&limit=1000")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerToken}`);
        expect(res).property("statusCode").to.eq(200);
        expect(res.body).property("transfers").lengthOf(1);
        expect(res.body.transfers[0]).property("state").eq("requested");
        expect(res.body.transfers[0]).property("id").to.be.a.uuid('v4')
        requestedTransferId = res.body.transfers[0].id;
      })

      describe(`${seed.wallet.name} fulfill this requested transfer with tokens`, () => {
        beforeEach(async () => {
          const res = await request(server)
            .post(`/transfers/${requestedTransferId}/fulfill`)
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerToken}`)
            .send({
              tokens: [seed.token.id],
            });
          expect(res).property("statusCode").to.eq(200);
        })

        it(`${seed.walletB.name} should be able to find requested transfer has been completed`, async () => {
          const res = await request(server)
            .get("/transfers?state=completed&limit=1000")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerTokenB}`);
          expect(res).property("statusCode").to.eq(200);
          expect(res.body).property("transfers").lengthOf(1);
          expect(res.body.transfers[0]).property("state").eq("completed");
          expect(res.body.transfers[0]).property("id").eq(requestedTransferId);
        });

        it(`Token:#${seed.token.id} now should still belong to ${seed.walletB.name}`, async () => {
          const res = await request(server)
            .get(`/tokens/${seed.token.id}`)
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${bearerTokenB}`);
          expect(res).to.have.property('statusCode', 200);
          expect(res.body.wallet_id).eq(seed.walletB.id);
        });
      });

    });

  });


    it(`Should be able to find the trust relationship: 'manage ${seed.walletC.name}`, async () => {
      const res = await request(server)
        .get("/trust_relationships?limit=1000")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`);
      expect(res).property("statusCode").to.eq(200);
      expect(res).property("body").property("trust_relationships").lengthOf(1);
      expect(res.body.trust_relationships[0]).property("id").to.be.a.uuid('v4')
      expect(res.body.trust_relationships.some(trust => {
        return trust.type === TrustRelationship.ENTITY_TRUST_TYPE.manage &&
          trust.target_wallet === seed.walletC.name;
      })).eq(true);
    });

    it(`Via ${seed.walletB.name}, can transfer token between ${seed.walletC.name} and others`, async () => {
      const res = await request(server)
        .post("/transfers")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({
          bundle: {
            bundle_size: 1,
          },
          sender_wallet: seed.wallet.name,
          receiver_wallet: seed.walletC.name,
        });
      expect(res).property("statusCode").to.eq(202);
    });

  describe(`Send a token to ${seed.walletC.name}`, () => {
    let transferId = 0;

    beforeEach(async () => {
      const res = await request(server)
        .post("/transfers")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({
          tokens: [seed.token.id],
          sender_wallet: seed.wallet.name,
          receiver_wallet: seed.walletC.name,
        });
      console.log('NN')
      console.log(res.body)
      expect(res).property("statusCode").to.eq(202);
      expect(res.body).property("id").to.be.a.uuid('v4')
      transferId = res.body.id;
    })


    describe(`${seed.walletB.name} can accept the transfer for ${seed.walletC.name}`, () => {
      beforeEach(async () => {
        const res = await request(server)
          .post(`/transfers/${transferId}/accept`)
          .set('Content-Type', "application/json")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerTokenB}`);
        expect(res).to.have.property('statusCode', 200);
      })

      it(`Token:#${seed.token.id} now should belong to walletC:${seed.walletC.name}`, async () => {
        const res = await request(server)
          .get(`/tokens/${seed.token.id}`)
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerTokenB}`);
        expect(res).to.have.property('statusCode', 200);
        expect(res.body.wallet_id).eq(seed.walletC.id);
      });
    });





  describe("Relationship", () => {

    beforeEach(async () => {
      const res = await request(server)
        .post("/trust_relationships")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({
          trust_request_type: 'send',
          requestee_wallet: seed.walletC.name,
        });
      console.log(res.body)
      expect(res).property("statusCode").to.eq(200);
    });

    it("GET /trust_relationships", async () => {
      const res = await request(server)
        .get("/trust_relationships")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerToken}`);
      expect(res).property("statusCode").to.eq(200);
      expect(res).property("body").property("trust_relationships").lengthOf(1);
      expect(res.body.trust_relationships[0]).property("id").to.be.a.uuid('v4')
    });

    describe("Request trust relationship", () => {
      it("POST /trust_relationships with wrong request type", async () => {
        const res = await request(server)
          .post("/trust_relationships")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerToken}`)
          .send({
            trust_request_type: 'wrongtype',
            wallet: 'any',
          });
        expect(res).property("statusCode").to.eq(422);
      });

      it("POST /trust_relationships", async () => {
        const res = await request(server)
          .post("/trust_relationships")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerToken}`)
          .send({
            trust_request_type: 'send',
            requestee_wallet: seed.walletB.name,
          });
        console.log(res.body)
        expect(res).property("statusCode").to.eq(200);
      });
    });
  });

  describe(`${seed.walletB.name} try to request "manage" relationship to ${seed.wallet}`, () => {
    let trustRelationshipId;
    beforeEach(async () => {
      let res = await request(server)
        .post("/trust_relationships")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({
          trust_request_type: 'manage',
          requestee_wallet: seed.wallet.name,
        });
      console.log("MM")
      console.log(res.body)
      expect(res).property("statusCode").to.eq(200);
      trustRelationship = res.body;
      expect(trustRelationship).property("id").to.be.a.uuid('v4')
      expect(trustRelationship).property("state").eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested);
      trustRelationshipId = trustRelationship.id;
    })

    describe(`POST /trust_relationships/$trustRelationshipId/accept`, () => {
      it(`${seed.wallet.name} accept this request`, async () => {
        const res = await request(server)
          .post(`/trust_relationships/${trustRelationshipId}/accept`)
          .set('Content-Type', "application/json")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerToken}`);

      console.log("MM")
      console.log(res.body)
        expect(res).property("statusCode").to.eq(200);
        expect(res.body).property("state").eq("trusted");
        expect(res.body).property("type").eq("manage");
        expect(res.body).property("actor_wallet").eq(seed.walletB.name);
        expect(res.body).property("target_wallet").eq(seed.wallet.name);
      });
    });

  });

  describe(`${seed.walletB.name} try to request "yield" relationship to ${seed.wallet.name}`, () => {
    let trustRelationshipId;

    beforeEach(async () => {
      res = await request(server)
        .post("/trust_relationships")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({
          trust_request_type: 'yield',
          requestee_wallet: seed.wallet.name,
        });
      expect(res).property("statusCode").to.eq(200);
      trustRelationship = res.body;
      expect(trustRelationship).property("id").to.be.a.uuid('v4');
      expect(trustRelationship).property("state").eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested);
      trustRelationshipId = trustRelationship.id;
    })

    describe(`${seed.wallet.name} accept this request`, () => {
      it("", async () => {
        const res = await request(server)
          .post(`/trust_relationships/${trustRelationshipId}/accept`)
          .set('Content-Type', "application/json")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${bearerToken}`);
        expect(res).property("statusCode").to.eq(200);
        expect(res.body).property("state").eq("trusted");
        expect(res.body).property("type").eq("manage");
        expect(res.body).property("actor_wallet").eq(seed.walletB.name);
        expect(res.body).property("target_wallet").eq(seed.wallet.name);
      });
    });

  });

});

});



