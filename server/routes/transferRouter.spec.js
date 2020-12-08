const request = require("supertest");
const express = require("express");
const transferRouter = require("./transferRouter");
const {expect} = require("chai");
const {errorHandler} = require("./utils");
const sinon = require("sinon");
const ApiKeyService = require("../services/ApiKeyService");
const bodyParser = require('body-parser');
const WalletService = require("../services/WalletService");
const JWTService = require("../services/JWTService");
const HttpError = require("../utils/HttpError");
const Token = require("../models/Token");
const TokenService = require("../services/TokenService");
const Wallet = require("../models/Wallet");
const Transfer = require("../models/Transfer");
const TransferService = require("../services/TransferService");
const Session = require("../models/Session");

describe("transferRouter", () => {
  let app;
  let session = new Session();

  const walletLogin = {
    id: 1,
  }

  beforeEach(() => {
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "verify").returns({
      id: walletLogin.id,
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
    const res = await request(app)
      .post("/")
      .send({
        tokens: ["1"],
        receiver_wallet: "ssss",
      });
    expect(res).property("statusCode").eq(422);
    expect(res.body.message).match(/sender.*required/);
  });

  it("Duplicated token uuid should throw error", async () => {
    const res = await request(app)
      .post("/")
      .send({
        tokens: ["1", "1"],
        receiver_wallet: "ssss",
        sender_wallet: "ssss",
      });
    expect(res).property("statusCode").eq(422);
    expect(res.body.message).match(/duplicate/i);
  });

  it('transfer using sender and receiver name, should return 201', async () => {
    sinon
      .stub(WalletService.prototype, 'getById')
      .resolves(new Wallet(1));
    sinon
      .stub(WalletService.prototype, 'getByIdOrName')
      .onFirstCall()
      .resolves(new Wallet(1))
      .onSecondCall()
      .resolves(new Wallet(2));
    sinon.stub(TokenService.prototype, 'getByUUID').resolves(
      new Token({
        id: 1,
        entity_id: 1,
      }),
    );
    sinon.stub(Wallet.prototype, 'transfer').resolves({
      id: 1,
      state: Transfer.STATE.completed,
    });
    sinon.stub(TransferService.prototype, 'convertToResponse').resolves({
      id: 1,
      state: Transfer.STATE.completed,
    });
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
    sinon
      .stub(WalletService.prototype, 'getById')
      .onFirstCall()
      .resolves(new Wallet(1));
    sinon
      .stub(WalletService.prototype, 'getByIdOrName')
      .onFirstCall()
      .resolves(new Wallet(1))
      .onSecondCall()
      .resolves(new Wallet(2));

    sinon.stub(TokenService.prototype, 'getByUUID').resolves(
      new Token({
        id: 1,
        entity_id: 1,
      }),
    );
    sinon.stub(Wallet.prototype, 'transfer').resolves({
      id: 1,
      state: Transfer.STATE.completed,
    });
    sinon.stub(TransferService.prototype, 'convertToResponse').resolves({
      id: 1,
      state: Transfer.STATE.completed,
    });
    const res = await request(app)
      .post('/')
      .send({
        tokens: ['1'],
        sender_wallet: 1,
        receiver_wallet: 2,
      });
    expect(res).property('statusCode').eq(201);
  });

  it("all parameters fine, but no trust relationship, should return 202", async () => {
    sinon.stub(WalletService.prototype, "getByIdOrName").resolves(new Wallet(1));
    sinon.stub(WalletService.prototype, "getById").resolves({
      transfer: () => {},
    });
    sinon.stub(TokenService.prototype, "getByUUID").resolves(new Token({
      id:1,
      entity_id: 1,
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
        tokens: ["1"],
        sender_wallet: "ssss",
        receiver_wallet: "ssss",
      });
    expect(res).property("statusCode").eq(202);
  });

  it("bundle case, success, should return 201", async () => {
    sinon.stub(WalletService.prototype, "getByIdOrName").resolves(new Wallet(1));
    sinon.stub(WalletService.prototype, "getById").resolves({
      transfer: () => {},
    });
    sinon.stub(TokenService.prototype, "getByUUID").resolves(new Token({
      id:1,
      entity_id: 1,
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
        sender_wallet: "ssss",
        receiver_wallet: "ssss",
      });
    expect(res).property("statusCode").eq(202);
  });


  describe("/fulfill", () => {

    it("Duplicated token uuid should throw error", async () => {
      const res = await request(app)
        .post("/1/fulfill")
        .send({
          tokens: ["1", "1"],
        });
      expect(res).property("statusCode").eq(422);
      expect(res.body.message).match(/duplicate/i);
    });
  });

});
