const request = require("supertest");
const express = require("express");
const walletRouter = require("./walletRouter");
const {expect} = require("chai");
const {errorHandler} = require("./utils");
const sinon = require("sinon");
const bodyParser = require('body-parser');
const ApiKeyService = require("../services/ApiKeyService");
const WalletService = require("../services/WalletService");
const TrustService = require("../services/TrustService");
const JWTService = require("../services/JWTService");
const HttpError = require("../utils/HttpError");
const Wallet = require("../models/Wallet");


describe("walletRouter", ()=> {
  let app;
  const walletLogin = {
    id: 1,
  }
  const walletSub = {
    id: 2,
  }

  beforeEach(() => {
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "verify").returns({
      id: walletLogin.id,
    });
    app = express();
    app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(bodyParser.json()); // parse application/json
    app.use(walletRouter);
    app.use(errorHandler);
  })

  afterEach(() => {
    sinon.restore();
  })

  // describe("post /wallets", () => {

    // it("successfully", async () => {
    //   const wallet = new Wallet(1);
    //   const wallet2 = new Wallet(2);
    //   sinon.stub(WalletService.prototype, "getById").resolves(wallet);
    //   sinon.stub(WalletService.prototype, "getByName").resolves(wallet2);
    //   const fn = sinon.stub(Wallet.prototype, "requestTrustFromAWallet");
    //   sinon.stub(TrustService.prototype, "convertToResponse").resolves({});
    //   const res = await request(app)
    //     .post("/")
    //     .send({
    //       trust_request_type: "send",
    //       target_wallet: "test",
    //     });
    //   expect(res).property("statusCode").eq(200);
    //   expect(fn).calledWith(
    //     "send",
    //     wallet,
    //     wallet2,
    //   )
    // });
  // });

  describe("get /wallets", () => {

    it.only("successfully", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(new Wallet(1));
      sinon.stub(TrustService.prototype, "convertToResponse").resolves({id:1});
      const fn = sinon.stub(Wallet.prototype, "getSubWallets").resolves([new Wallet({id:1}), new Wallet({id:2})]);
      const res = await request(app)
        .get('/');
      expect(res).property("statusCode").eq(200);
      expect(res.body.wallets).lengthOf(2);
    });
  })
})