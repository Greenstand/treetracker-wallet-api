/*
 * The integration test to test the whole business, with DB
 */

const request = require('supertest');
const server = require("../server/app");
const { expect } = require('chai');
const seed = require('./seed');
const log = require('loglevel');
const Transfer = require("../server/models/Transfer");
const TrustRelationship = require("../server/models/TrustRelationship");
const sinon = require("sinon");

const mockUser = {
  wallet: seed.wallet.name,
  password: seed.wallet.password,
};

const newWallet = {
  name: 'MyFriendsNewWallet',
};

const apiKey = seed.apiKey;

describe('Wallet integration tests', () => {
  let token;

  beforeEach(async () => {
    //In case other sinon stub would affect me 
    sinon.restore();
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

  // Tests that require logged-in authorization

  it(`[GET /tokens/${seed.token.uuid}] Should be able to get a token `, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.uuid}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${token}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('uuid').eq(seed.token.uuid);
  });

  describe(`Before request trust, try to send token:#${seed.token.id} from ${seed.wallet.name} to ${seed.walletB.name} should be pending (202)`, () => {
    let transferId;

    beforeEach(async () => {
      const res = await request(server)
        .post("/transfers")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({
          tokens: [seed.token.uuid],
          sender_wallet: seed.wallet.name,
          receiver_wallet: seed.walletB.name,
        });
      expect(res).property("statusCode").to.eq(202);
      expect(res).property("body").property("id").a("number");
      expect(res).property("body").property("parameters").property("tokens").lengthOf(1);
      transferId = res.body.id;
    })

    it(`Token:#${seed.token.id} now should be pending `, async () => {
      const res = await request(server)
        .get(`/tokens/${seed.token.uuid}`)
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`);
      expect(res).to.have.property('statusCode', 200);
      expect(res.body.transfer_pending).eq(true);
    });

    describe(`Login with ${seed.walletB.name}`, () => {
      let tokenB;

      beforeEach(async () => {
        const res = await request(server)
          .post('/auth')
          .set('treetracker-api-key', apiKey)
          .send({
            wallet: seed.walletB.name,
            password: seed.walletB.password,
          });
        expect(res).to.have.property('statusCode', 200);
        tokenB = res.body.token;
      })

      describe("Get all pending transfers belongs to walletB, should have one", () => {
        let pendingTransfer;

        beforeEach(async () => {
          const res = await request(server)
            .get('/transfers?state=pending')
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${tokenB}`);
          expect(res).to.have.property('statusCode', 200);
          expect(res.body.transfers).lengthOf(1);
          pendingTransfer = res.body.transfers[0];
          expect(pendingTransfer).property("destination_wallet").eq(seed.walletB.name);
        })

        describe("Accept the pending transfer", () => {

          beforeEach(async () => {
            const res = await request(server)
              .post(`/transfers/${pendingTransfer.id}/accept`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${tokenB}`);
            expect(res).to.have.property('statusCode', 200);
          })

          it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be completed`, async () => {
            const res = await request(server)
              .get(`/transfers`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfers).lengthOf(1);
            expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.completed);
          });

          it(`Token:#${seed.token.id} now should belong to ${seed.walletB.name}`, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.uuid}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.entity_id).eq(seed.walletB.id);
          });
        });

        describe("Decline the pending transfer", () => {

          beforeEach(async () => {
            const res = await request(server)
              .post(`/transfers/${pendingTransfer.id}/decline`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${tokenB}`);
            expect(res).to.have.property('statusCode', 200);
          })

          it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be cancelled`, async () => {
            const res = await request(server)
              .get(`/transfers`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfers).lengthOf(1);
            expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.cancelled);
          });

          it(`Token:#${seed.token.id} now should still belong to ${seed.wallet.name}`, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.uuid}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.entity_id).eq(seed.wallet.id);
          });

          it(`Token:#${seed.token.id} now shouldn't be pending `, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.uuid}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfer_pending).eq(false);
          });

        });

        describe("Delete/cancel the pending transfer", () => {

          beforeEach(async () => {
            const res = await request(server)
              .del(`/transfers/${pendingTransfer.id}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
          })

          it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be cancelled`, async () => {
            const res = await request(server)
              .get(`/transfers`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfers).lengthOf(1);
            expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.cancelled);
          });

          it(`Token:#${seed.token.id} now shouldn't be pending `, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.uuid}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfer_pending).eq(false);
          });
        });

      });

    });

    describe("Login with ${seed.walletC.name}", () => {
      let tokenC;

      beforeEach(async () => {
        const res = await request(server)
          .post('/auth')
          .set('treetracker-api-key', apiKey)
          .send({
            wallet: seed.walletC.name,
            password: seed.walletC.password,
          });
        expect(res).to.have.property('statusCode', 200);
        expect(res).property('body').property("token").a("string");
        tokenC = res.body.token;
      })

      it(`${seed.walletC.name} should not be able to accept the transfer (403)`, async () => {
        const res = await request(server)
          .post(`/transfers/${transferId}/accept`)
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${tokenC}`);
        expect(res).to.have.property('statusCode', 403);
        expect(res).property("body").property("message").match(/permission/i);
      });
    });

    describe(`${seed.wallet.name} request "send" trust relationship with ${seed.walletB.name} `, () => {
      let trustRelationship;

      beforeEach(async () => {
        const res = await request(server)
          .post("/trust_relationships")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`)
          .send({
            trust_request_type: 'send',
            requestee_wallet: seed.walletB.name,
          });
        expect(res).property("statusCode").to.eq(200);
        trustRelationship = res.body;
        expect(trustRelationship).property("id").a("number");
        expect(trustRelationship).property("state").eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested);
      });

      describe("Login with walletB", () => {
        let tokenB;

        beforeEach(async () => {
          const res = await request(server)
            .post('/auth')
            .set('treetracker-api-key', apiKey)
            .send({
              wallet: seed.walletB.name,
              password: seed.walletB.password,
            });
          expect(res).to.have.property('statusCode', 200);
          tokenB = res.body.token;
        })

        describe("Accept this request", () => {

          beforeEach(async () => {
            const res = await request(server)
              .post(`/trust_relationships/${trustRelationship.id}/accept`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${tokenB}`);
            expect(res).property("statusCode").to.eq(200);
          })

          it("Wallet should be able to find the relationship, and it was approved", async () => {
            const res = await request(server)
              .get("/trust_relationships")
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).property("statusCode").to.eq(200);
            expect(res).property("body").property("trust_relationships").lengthOf(1);
            expect(res.body.trust_relationships[0]).property("id").a("number");
          });

          it("Try to send a token to walletB again, this time, should success, 201", async () => {
            const res = await request(server)
              .post("/transfers")
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`)
              .send({
                tokens: [],
                sender_wallet: seed.wallet.name,
                receiver_wallet: seed.walletB.name,
              });
            expect(res).property("statusCode").to.eq(201);
            expect(res).property("body").property("parameters").property("tokens").lengthOf(0);
          });
        });

        describe("Decline this request", () => {

          beforeEach(async () => {
            const res = await request(server)
              .post(`/trust_relationships/${trustRelationship.id}/decline`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${tokenB}`);
            expect(res).property("statusCode").to.eq(200);
          })

          it("Wallet should be able to find the relationship, and it was cancelled", async () => {
            const res = await request(server)
              .get("/trust_relationships")
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).property("statusCode").to.eq(200);
            expect(res).property("body").property("trust_relationships").lengthOf(1);
            expect(res.body.trust_relationships[0]).property("id").a("number");
            expect(res.body.trust_relationships[0]).property("state").eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.canceled_by_target);
          });

        });
      });

      describe(`Cancel this request by ${seed.wallet.name}`, () => {

        beforeEach(async () => {
          const res = await request(server)
            .del(`/trust_relationships/${trustRelationship.id}`)
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${token}`);
          expect(res).property("statusCode").to.eq(200);
        })

        it("Wallet should be able to find the relationship, and it was cancelled", async () => {
          const res = await request(server)
            .get("/trust_relationships")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${token}`);
          expect(res).property("statusCode").to.eq(200);
          expect(res).property("body").property("trust_relationships").lengthOf(1);
          expect(res.body.trust_relationships[0]).property("id").a("number");
          expect(res.body.trust_relationships[0]).property("state").eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.cancelled_by_originator);
        });

      });
    });
  });

  describe(`Bundle transfer tokens from ${seed.wallet.name} to ${seed.walletB.name}`, () => {

    beforeEach(async () => {
      const res = await request(server)
        .post("/transfers")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
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

    describe("Login with ${seed.walletB.name}", () => {
      let tokenB;

      beforeEach(async () => {
        const res = await request(server)
          .post('/auth')
          .set('treetracker-api-key', apiKey)
          .send({
            wallet: seed.walletB.name,
            password: seed.walletB.password,
          });
        expect(res).to.have.property('statusCode', 200);
        tokenB = res.body.token;
      })

      describe("get all pending transfers belongs to walletB, should have one", () => {
        let pendingTransfer;

        beforeEach(async () => {
          const res = await request(server)
            .get('/transfers?state=pending')
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${tokenB}`);
          expect(res).to.have.property('statusCode', 200);
          expect(res.body.transfers).lengthOf(1);
          pendingTransfer = res.body.transfers[0];
          expect(pendingTransfer).property("destination_wallet").eq(seed.walletB.name);
        })

        describe("Accept the pending transfer", () => {

          beforeEach(async () => {
            const res = await request(server)
              .post(`/transfers/${pendingTransfer.id}/accept`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${tokenB}`);
            expect(res).to.have.property('statusCode', 200);
          })

          it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be completed`, async () => {
            const res = await request(server)
              .get(`/transfers`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfers).lengthOf(1);
            expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.completed);
          });

          it(`Token:#${seed.token.id} now should belong to ${seed.walletB.name}`, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.uuid}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.entity_id).eq(seed.walletB.id);
          });
        });

        describe("Decline the pending transfer", () => {

          beforeEach(async () => {
            const res = await request(server)
              .post(`/transfers/${pendingTransfer.id}/decline`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${tokenB}`);
            expect(res).to.have.property('statusCode', 200);
          })

          it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be cancelled`, async () => {
            const res = await request(server)
              .get(`/transfers`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfers).lengthOf(1);
            expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.cancelled);
          });

          it(`Token:#${seed.token.id} now should still belong to ${seed.wallet.name}`, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.uuid}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.entity_id).eq(seed.wallet.id);
          });
        });

        describe("Delete/cancel the pending transfer", () => {

          beforeEach(async () => {
            const res = await request(server)
              .del(`/transfers/${pendingTransfer.id}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
          })

          it(`Wallet:${seed.wallet.name} should be able to find the transfer, it should be cancelled`, async () => {
            const res = await request(server)
              .get(`/transfers`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.transfers).lengthOf(1);
            expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.cancelled);
          });
        });

      });

    });
  });

  describe("Login with walletB", () => {
    let tokenB;

    beforeEach(async () => {
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', apiKey)
        .send({
          wallet: seed.walletB.name,
          password: seed.walletB.password,
        });
      expect(res).to.have.property('statusCode', 200);
      tokenB = res.body.token;
    })

    describe(`WalletB:${seed.walletB.name} request a token from ${seed.wallet.name}, should get 202`, () => {

      beforeEach(async () => {
        const res = await request(server)
          .post("/transfers")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({
            tokens: [seed.token.uuid],
            sender_wallet: seed.wallet.name,
            receiver_wallet: seed.walletB.name,
          });
        expect(res).property("statusCode").to.eq(202);
      })

      describe(`${seed.wallet.name} should find a requested transfer sent to him`, () => {
        let requestedTransferId;

        beforeEach(async () => {
          const res = await request(server)
            .get("/transfers?state=requested")
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${token}`);
          expect(res).property("statusCode").to.eq(200);
          expect(res.body).property("transfers").lengthOf(1);
          expect(res.body.transfers[0]).property("state").eq("requested");
          expect(res.body.transfers[0]).property("id").a("number");
          requestedTransferId = res.body.transfers[0].id;
        })

        describe(`${seed.wallet.name} fulfill this requested transfer`, () => {
          beforeEach(async () => {
            const res = await request(server)
              .post(`/transfers/${requestedTransferId}/fulfill`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${token}`);
            expect(res).property("statusCode").to.eq(200);
          })

          it(`${seed.walletB.name} should be able to find requested transfer has been completed`, async () => {
            const res = await request(server)
              .get("/transfers?state=completed")
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${tokenB}`);
            expect(res).property("statusCode").to.eq(200);
            expect(res.body).property("transfers").lengthOf(1);
            expect(res.body.transfers[0]).property("state").eq("completed");
            expect(res.body.transfers[0]).property("id").eq(requestedTransferId);
          });

          it(`Token:#${seed.token.id} now should still belong to ${seed.walletB.name}`, async () => {
            const res = await request(server)
              .get(`/tokens/${seed.token.uuid}`)
              .set('treetracker-api-key', apiKey)
              .set('Authorization', `Bearer ${tokenB}`);
            expect(res).to.have.property('statusCode', 200);
            expect(res.body.entity_id).eq(seed.walletB.id);
          });
        });

      });


    });

  })

  describe("Login with walletB", () => {
    let tokenB;

    beforeEach(async () => {
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', apiKey)
        .send({
          wallet: seed.walletB.name,
          password: seed.walletB.password,
        });
      expect(res).to.have.property('statusCode', 200);
      tokenB = res.body.token;
    })

    it(`Should be able to find the trust relationship: 'mange ${seed.walletC.name}`, async () => {
      const res = await request(server)
        .get("/trust_relationships")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res).property("statusCode").to.eq(200);
      expect(res).property("body").property("trust_relationships").lengthOf(1);
      expect(res.body.trust_relationships[0]).property("id").a("number");
      expect(res.body.trust_relationships.some(trust => {
        return trust.type === TrustRelationship.ENTITY_TRUST_TYPE.manage &&
          trust.target_wallet === seed.walletC.name;
      })).eq(true);
    });

    it(`Via ${seed.walletB.name}, can transfer token between ${seed.walletC.name} and others`, async () => {
      const res = await request(server)
        .post("/transfers")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          bundle: {
            bundle_size: 1,
          },
          sender_wallet: seed.wallet.name,
          receiver_wallet: seed.walletC.name,
        });
      expect(res).property("statusCode").to.eq(202);
    });
  });

  describe(`Send a token to ${seed.walletC.name}`, () => {
    let transferId = 0;

    beforeEach(async () => {
      const res = await request(server)
        .post("/transfers")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({
          tokens: [seed.token.uuid],
          sender_wallet: seed.wallet.name,
          receiver_wallet: seed.walletC.name,
        });
      expect(res).property("statusCode").to.eq(202);
      expect(res.body).property("id").a("number");
      transferId = res.body.id;
    })

    describe("Login with walletB", () => {
      let tokenB;

      beforeEach(async () => {
        const res = await request(server)
          .post('/auth')
          .set('treetracker-api-key', apiKey)
          .send({
            wallet: seed.walletB.name,
            password: seed.walletB.password,
          });
        expect(res).to.have.property('statusCode', 200);
        tokenB = res.body.token;
      })

      describe(`${seed.walletB.name} can accept the transfer for ${seed.walletC.name}`, () => {
        beforeEach(async () => {
          const res = await request(server)
            .post(`/transfers/${transferId}/accept`)
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${tokenB}`);
          expect(res).to.have.property('statusCode', 200);
        })

        it(`Token:#${seed.token.id} now should belong to walletC:${seed.walletC.name}`, async () => {
          const res = await request(server)
            .get(`/tokens/${seed.token.uuid}`)
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${tokenB}`);
          expect(res).to.have.property('statusCode', 200);
          expect(res.body.entity_id).eq(seed.walletC.id);
        });
      });
    });


  });



  describe.skip("Relationship", () => {

    beforeEach(async () => {
      const res = await request(server)
        .post("/trust_relationships")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({
          trust_request_type: 'send',
          wallet: seed.wallet.name,
        });
      expect(res).property("statusCode").to.eq(200);
    });
    it("GET /trust_relationships", async () => {
      const res = await request(server)
        .get("/trust_relationships")
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`);
      expect(res).property("statusCode").to.eq(200);
      log.debug(res);
      expect(res).property("body").property("trust_relationships").lengthOf(1);
      expect(res.body.trust_relationships[0]).property("id").a("number");
    });

    describe("Request trust relationship", () => {
      it("POST /trust_relationships with wrong request type", async () => {
        const res = await request(server)
          .post("/trust_relationships")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`)
          .send({
            trust_request_type: 'wrongtype',
            wallet: 'any',
          });
        expect(res).property("statusCode").to.eq(400);
      });

      it("POST /trust_relationships", async () => {
        const res = await request(server)
          .post("/trust_relationships")
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`)
          .send({
            trust_request_type: 'send',
            wallet: seed.wallet.name,
          });
        expect(res).property("statusCode").to.eq(200);
      });
    });
  });

});

/* __________________________OLD TESTS FOR PREVIOUS API VERSION___________________________

  xdescribe(`[POST /transfer] Now transfer wallet:${seed.wallet.name}'s token to the new wallet`, () => {

    beforeEach(async () => {
      const res = await request(server)
        .post('/transfer')
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({
          tokens: [seed.token.uuid],
          sender_wallet: seed.wallet.name,
          receiver_wallet: newWallet.name,
        });
      expect(res)
        .to.have.property('statusCode', 200);
    });

    xit('[GET /history] Should be able to find a record about this token in the history API', async () => {
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
        .to.have.property('sender_wallet', seed.wallet.name);
      expect(res.body.history[0])
        .to.have.property('receiver_wallet', newWallet.name);
    });

  });

  describe(`[POST /send] Now transfer wallet:${seed.wallet.name}'s token to the new wallet`, () => {

    beforeEach(async () => {
      const res = await request(server)
        .post('/send')
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({
          tokens: [seed.token.uuid],
          receiver_wallet: newWallet.name,
        });
      expect(res)
        .to.have.property('statusCode', 200);
    });

    xit('[GET /history] Should be able to find a record about this token in the history API', async () => {
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
        .to.have.property('sender_wallet', seed.wallet.name);
      expect(res.body.history[0])
        .to.have.property('receiver_wallet', newWallet.name);
    });

  });

});

  // Get trees in user's wallet
  describe('[GET /tree] gets trees from logged in user wallet', () => {

    xit(`Should have 1 tree under the wallet:${seed.entity.wallet}`, (done) => {
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

  // Get details of logged in account
  xit(`[GET /wallet] get account should find the current wallet ${seed.wallet.name}`, async () => {
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
      .that.to.have.property('wallet', seed.wallet.name);
  });

  describe(`[POST /wallet] Create subWallet '${newWallet.name}`, () => {

    beforeEach(async () => {
      const res = await request(server)
        .post('/wallets')
        .set('treetracker-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({
          wallet: newWallet.name,
        });
      expect(res)
        .to.have.property('statusCode', 200);
    });



    xit('[GET /wallets] Should find two accounts now', async () => {
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

      xit('[GET /history] Should be able to find a record about this token in the history API', async () => {
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

*/

