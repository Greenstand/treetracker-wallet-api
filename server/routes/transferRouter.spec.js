const request = require("supertest");
const express = require("express");
const sinon = require("sinon");
const chai = require("chai");
const sinonChai = require("sinon-chai");
const bodyParser = require('body-parser');
const { extractExpectedAssertionsErrors } = require("expect");
const uuid = require('uuid');
const transferRouter = require("./transferRouter");
const {errorHandler} = require("./utils");

chai.use(sinonChai);
const {expect} = chai;
const ApiKeyService = require("../services/ApiKeyService");
const WalletService = require("../services/WalletService");
const JWTService = require("../services/JWTService");
const HttpError = require("../utils/HttpError");
const Token = require("../models/Token");
const TokenService = require("../services/TokenService");
const Wallet = require("../models/Wallet");
const Transfer = require("../models/Transfer");
const TransferService = require("../services/TransferService");
const Session = require("../models/Session");
const { column } = require("../database/knex");

describe("transferRouter", () => {
  let app;
  const session = new Session();

  const authenticatedWallet = new Wallet(uuid.v4())

  beforeEach(() => {
    sinon.stub(Session.prototype);
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "verify").returns({
      id: authenticatedWallet.getId(),
    });
    app = express();
    app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(bodyParser.json()); // parse application/json
    app.use(transferRouter);
    app.use(errorHandler);
  })

  afterEach(() => {
    sinon.restore();
  })

  // test for limit 
  it("limit parameters missed", async () => {
    const res = await request(app)
      .get("/");
    expect(res).property("statusCode").eq(422);
  });

  it("with limit and offset specified, should return correct number", async () => {
    sinon
      .stub(WalletService.prototype, 'getById')
      .resolves(new Wallet(uuid.v4()));
    sinon
      .stub(WalletService.prototype, 'getByIdOrName')
      .resolves(new Wallet(uuid.v4()));

    const getTransfersStub = sinon.stub(Wallet.prototype, 'getTransfers')
    getTransfersStub.resolves(
      [{},{},{}].map((_,i) => ({id:uuid.v4(), state:Transfer.STATE.completed})
      ));

    const token0Id = uuid.v4();
    const token1Id = uuid.v4();
    const token2Id = uuid.v4();

    sinon.stub(TransferService.prototype, "convertToResponse")
    .onCall(0).resolves({id:token0Id, state:Transfer.STATE.completed})
    .onCall(1).resolves({id:token1Id, state:Transfer.STATE.completed})
    .onCall(2).resolves({id:token2Id, state:Transfer.STATE.completed});

    const res = await request(app)
      .get("/?limit=3&wallet=testWallet&offset=5");
    expect(res.body.transfers).lengthOf(3);
    expect(getTransfersStub.getCall(0).args[0]).to.deep.equal(undefined, 5, 3)
    expect(res.body.transfers.map(t=>(t.id))).to.deep.equal([token0Id, token1Id, token2Id]);
  });

  it("missing tokens should throw error", async () => {
    const res = await request(app)
      .post("/")
      .send({
        sender_wallet: "ssss",
        receiver_wallet: "ssss",
      });
    expect(res).property("statusCode").eq(422);
    expect(res.body.message).match(/bundle.*required/);
  });

  it("missing sender wallet should throw error", async () => {
    const walletId = uuid.v4()
    const tokenId = uuid.v4()
    const res = await request(app)
      .post("/")
      .send({
        tokens: [tokenId],
        receiver_wallet: "ssss",
      });
    expect(res).property("statusCode").eq(422);
    expect(res.body.message).match(/sender.*required/);
  });

  it("Duplicated token uuid should throw error", async () => {
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const tokenId = uuid.v4()
    const res = await request(app)
      .post("/")
      .send({
        tokens: [tokenId, tokenId],
        receiver_wallet: walletId,
        sender_wallet: wallet2Id,
      });
    expect(res).property("statusCode").eq(422);
    expect(res.body.message).match(/duplicate/i);
  });

  it('transfer using sender and receiver name, should return 201', async () => {
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const tokenId = uuid.v4()
    sinon
      .stub(WalletService.prototype, 'getById')
      .resolves(new Wallet(walletId));
    sinon
      .stub(WalletService.prototype, 'getByIdOrName')
      .onFirstCall()
      .resolves(new Wallet(walletId))
      .onSecondCall()
      .resolves(new Wallet(wallet2Id));
    sinon.stub(TokenService.prototype, 'getById').resolves(
      new Token({
        id: uuid.v4(),
        wallet_id: walletId,
      }),
    );
    sinon.stub(Wallet.prototype, 'transfer').resolves({
      id: tokenId,
      state: Transfer.STATE.completed,
    });
    sinon.stub(TransferService.prototype, 'convertToResponse').resolves({
      id: tokenId,
      state: Transfer.STATE.completed,
    });
    sinon.stub(TransferService.prototype, "sendMessage");
    const res = await request(app)
      .post('/')
      .send({
        tokens: ['1'],
        sender_wallet: 'wallet1',
        receiver_wallet: 'wallet2',
      });
    expect(res).property('statusCode').eq(201);
  });

  it('Transfer using sender and receiver id, should return 201', async () => {
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const tokenId = uuid.v4()
    const transferId = uuid.v4()
    sinon
      .stub(WalletService.prototype, 'getById')
      .onFirstCall()
      .resolves(new Wallet(walletId));
    sinon
      .stub(WalletService.prototype, 'getByIdOrName')
      .onFirstCall()
      .resolves(new Wallet(walletId))
      .onSecondCall()
      .resolves(new Wallet(wallet2Id));

    sinon.stub(TokenService.prototype, 'getById').resolves(
      new Token({
        id: tokenId,
        wallet_id: walletId,
      }),
    );
    sinon.stub(Wallet.prototype, 'transfer').resolves({
      id: transferId,
      state: Transfer.STATE.completed,
    });
    sinon.stub(TransferService.prototype, 'convertToResponse').resolves({
      id: transferId,
      state: Transfer.STATE.completed,
    });
    const sendMessage = sinon.stub(TransferService.prototype, "sendMessage");
    const res = await request(app)
      .post('/')
      .send({
        tokens: [tokenId],
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
      });
    expect(res).property('statusCode').eq(201);
    
    // should not send message to queue because ENV = test
    sinon.assert.notCalled(sendMessage);
  });

  // //TODO: test for case 1: with trust relationship, tokens specified
  // it.only('claim transfer with existing trust relationship, and specified tokens', async () => {
  //   sinon
  //     .stub(WalletService.prototype, 'getById')
  //     .resolves(new Wallet(1));
  //   sinon
  //     .stub(WalletService.prototype, 'getByIdOrName')
  //     .onFirstCall()
  //     .resolves(new Wallet(1))
  //     .onSecondCall()
  //     .resolves(new Wallet(2));
  //   sinon.stub(TokenService.prototype, 'getByUUID').resolves(
  //     new Token({
  //       id: 1,
  //       entity_id: 1,
  //     }),
  //   );
  //   sinon.stub(Wallet.prototype, 'transfer').resolves({
  //     id: 1,
  //     state: Transfer.STATE.completed,
  //   });
  //   sinon.stub(TransferService.prototype, 'convertToResponse').resolves({
  //     id: 1,
  //     state: Transfer.STATE.completed,
  //   });

  //   const res = await request(app)
  //     .post('/')
  //     .send({
  //       tokens: ['1'],
  //       sender_wallet: 1,
  //       receiver_wallet: 2,
  //       claim: true,
  //     });
    
  //   console.log(res);
  //   expect(res).property('statusCode').eq(201);
  // });

  // check what's in the db, after transfer claim
  // test transfer, in wallet.spec.js

  it("all parameters fine, but no trust relationship, should return 202", async () => {
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const tokenId = uuid.v4()
    sinon.stub(WalletService.prototype, "getByIdOrName").resolves(new Wallet(walletId));
    sinon.stub(WalletService.prototype, "getById").resolves({
      transfer: () => {},
    });
    sinon.stub(TokenService.prototype, "getById").resolves(new Token({
      id: tokenId,
      wallet_id: walletId,
    }, session));
    WalletService.prototype.getById.restore();    
    sinon.stub(WalletService.prototype, "getById").resolves({
      transfer: async () => {
        throw new HttpError(202);
      },
    });
    const res = await request(app)
      .post("/")
      .send({
        tokens: [tokenId],
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
      });
    expect(res).property("statusCode").eq(202);
  });

  it("bundle case, success, should return 201", async () => {
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const tokenId = uuid.v4()
    sinon.stub(WalletService.prototype, "getByIdOrName").resolves(new Wallet(walletId));
    sinon.stub(WalletService.prototype, "getById").resolves({
      transfer: () => {},
    });
    sinon.stub(TokenService.prototype, "getById").resolves(new Token({
      id: tokenId,
      wallet_id: walletId,
      claim: false,
    }, session));
    WalletService.prototype.getById.restore();    
    sinon.stub(WalletService.prototype, "getById").resolves({
      transferBundle: async () => {
        throw new HttpError(202);
      },
    });
    const res = await request(app)
      .post("/")
      .send({
        bundle: {
          bundle_size: 1,
        },
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
        claim: false,
      });
    expect(res).property("statusCode").eq(202);
  });

  it("bundle case, -1 should throw error", async () => {
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const res = await request(app)
      .post("/")
      .send({
        bundle: {
          bundle_size: -1,
        },
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
      });
    expect(res).property("statusCode").eq(422);
    expect(res.body.message).match(/greater/);
  });

  it("bundle case, 1.1 should throw error", async () => {
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const res = await request(app)
      .post("/")
      .send({
        bundle: {
          bundle_size: 1.1,
        },
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
      });
    expect(res).property("statusCode").eq(422);
    expect(res.body.message).match(/integer/);
  });

  it("bundle case, 10001 should throw error", async () => {
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const res = await request(app)
      .post("/")
      .send({
        bundle: {
          bundle_size: 10001,
        },
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
      });
    expect(res).property("statusCode").eq(422);
    expect(res.body.message).match(/less/);
  });


  describe("/fulfill", () => {
    const transferId = uuid.v4()
    const tokenId = uuid.v4()
    const token2Id = uuid.v4()

    it("Nether tokens nor implicit is specified, should throw error", async () => {
      const res = await request(app)
        .post(`/${transferId}/fulfill`)
        .send({
        });
      expect(res).property("statusCode").eq(422);
      expect(res.body.message).match(/implicit.*required/i);
    });

    it("Duplicated token uuid should throw error", async () => {
      const res = await request(app)
        .post(`/${transferId}/fulfill`)
        .send({
          tokens: [tokenId, tokenId],
        });
      expect(res).property("statusCode").eq(422);
      expect(res.body.message).match(/duplicate/i);
    });
  });

  describe("GET /{transfer_id}", () => {

    it("Successfully", async () => {
      const transferId = uuid.v4()
      const wallet = new Wallet(uuid.v4());
      const transfer = {id:transferId};
      const fn = sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      const fn2 = sinon.stub(Wallet.prototype, "getTransferById").resolves(transfer);
      const fn3 = sinon.stub(TransferService.prototype, "convertToResponse").resolves(transfer);
      const res = await request(app)
        .get(`/${transferId}`);
      expect(fn).calledWith(authenticatedWallet.getId());
      expect(fn2).calledWith(transferId);
      expect(fn3).calledWith(transfer);
      expect(res).property("statusCode").eq(200);
      expect(res.body).property("id").eq(transferId);
    });
  });

  describe("GET /{transfer_id}/tokens offset and limit working", () => {

    const transferId = uuid.v4();
    const tokenId = uuid.v4();
    const token2Id = uuid.v4();
    const token3Id = uuid.v4();
    const token4Id = uuid.v4();
    const transfer = {id:transferId};
    const token = new Token({id:tokenId});
    const token2 = new Token({id:token2Id});
    const token3 = new Token({id:token3Id});
    const token4 = new Token({id:token4Id});


    it("Successfully", async () => {
      const fn = sinon.stub(WalletService.prototype, "getById").resolves(authenticatedWallet);
      const fn2 = sinon.stub(Wallet.prototype, "getTokensByTransferId").resolves([token]);
      const res = await request(app)
        .get(`/${transferId}/tokens?limit=1`);
      expect(fn).calledWith(authenticatedWallet.getId());
      expect(fn2).calledWith(transferId);
      expect(res).property("statusCode").eq(200);
      expect(res.body).property("tokens").lengthOf(1);
    });

    it("limit and offset working successfully", async () => {
      const fn = sinon.stub(WalletService.prototype, "getById").resolves(authenticatedWallet);
      const fn2 = sinon.stub(Wallet.prototype, "getTokensByTransferId").resolves([token2, token3, token4]);
      const res = await request(app)
        .get(`/${transferId}/tokens?limit=3&offset=2`);
      expect(fn).calledWith(authenticatedWallet.getId());

      expect(fn2).calledWith(transferId,  3, 2);
      expect(res).property("statusCode").eq(200);
  
      expect(res.body).property("tokens").lengthOf(3);
      expect(res.body.tokens.map(t=>(t.id))).to.deep.equal([token2.getId(), token3.getId(), token4.getId()]);
    });
  })


});
