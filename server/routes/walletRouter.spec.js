const request = require("supertest");
const express = require("express");
const walletRouter = require("./walletRouter");
const {expect} = require("chai");
const {errorHandler} = require("./utils");
const sinon = require("sinon");
const bodyParser = require('body-parser');
const ApiKeyService = require("../services/ApiKeyService");
const WalletService = require("../services/WalletService");
const TokenService = require("../services/TokenService");
const TrustService = require("../services/TrustService");
const JWTService = require("../services/JWTService");
const HttpError = require("../utils/HttpError");
const Wallet = require("../models/Wallet");
const uuid = require('uuid');


describe("walletRouter", ()=> {
  let app;
  const walletLogin = {
    id: uuid.v4(),
  }
  const subWallet = {
    id: uuid.v4(),
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

  describe("get /wallets", () => {

    it("limit parameters missed", async () => {
      const res = await request(app)
        .get("/");
      expect(res).property("statusCode").eq(422);
    });

    it("successfully", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(new Wallet({id:1}));
      sinon.stub(TrustService.prototype, "convertToResponse").resolves({id:1});
      sinon.stub(TokenService.prototype, "countTokenByWallet").resolves(10);
      const fn = sinon.stub(Wallet.prototype, "getSubWallets").resolves([ new Wallet({id:2})]);
      const res = await request(app)
        .get('/?limit=2');
      expect(res).property("statusCode").eq(200);
      expect(res.body.wallets).lengthOf(2);
      expect(res.body.wallets[0]).property("tokens_in_wallet").eq(10);
    });
  })

  it("limit and offet working successfully", async () => {
    sinon.stub(WalletService.prototype, "getById").resolves(new Wallet({id:2}));
    sinon.stub(TrustService.prototype, "convertToResponse").resolves({id:2});
    sinon.stub(TokenService.prototype, "countTokenByWallet").resolves(10);
    const fn = sinon.stub(Wallet.prototype, "getSubWallets").resolves([ new Wallet({id:10}), new Wallet({id:11}), new Wallet({id:12})]);
    const res = await request(app)
      .get('/?limit=3&start=2');
    console.log(res.body.wallets);
    expect(res).property("statusCode").eq(200);
    expect(res.body.wallets).lengthOf(3);
    expect(res.body.wallets[0]).property("tokens_in_wallet").eq(10);
    expect(res.body.wallets[0]).property("id").eq(11);
    expect(res.body.wallets[1]).property("id").eq(12);
    expect(res.body.wallets[2]).property("id").eq(2);
  });


  describe("get /wallets/:wallet_id/trust_relationships", () => {

    it("successfully", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(new Wallet(1));
      sinon.stub(TrustService.prototype, "convertToResponse").resolves({id:1});
      const fn = sinon.stub(Wallet.prototype, "getTrustRelationships").resolves([new Wallet({id: 2})]);
      const res = await request(app)
        .get('/1/trust_relationships');
      expect(res).property("statusCode").eq(200);
      expect(res.body.trust_relationships).lengthOf(1);
    });
  })

  describe("post /wallets", () => {

    it("successfully", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(new Wallet(1));
      const fn = sinon.stub(Wallet.prototype, "addManagedWallet").resolves({id: 2, name: "test"});
      const res = await request(app)
        .post("/")
        .send({
          wallet: "subWallet"
        });
      expect(res).property("statusCode").eq(200);
      expect(res.body).to.have.property("wallet").eq("test");
      expect(fn).calledWith("subWallet");
    });

    it("missed parameter", async () => {
      const res = await request(app)
        .post("/")
        .send({
        });
      expect(res).property("statusCode").eq(422);
    });
  });

});
