const request = require("supertest");
const express = require("express");
const tokenRouter = require("./tokenRouter");
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
const uuid = require('uuid');

describe("tokenRouter", () => {
  let app;
  const authenticatedWallet = {
    id: uuid.v4()
  }

  beforeEach(() => {
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "verify").returns({
      id: authenticatedWallet.id,
    });
    app = express();
    app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(bodyParser.json()); // parse application/json
    app.use(tokenRouter);
    app.use(errorHandler);
  })

  afterEach(() => {
    sinon.restore();
  })

  describe("get tokens, GET /", () => {
    const tokenId = uuid.v4()
    const token2Id = uuid.v4()
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const transactionId = uuid.v4()

    const token = new Token({
      id: tokenId,
      wallet_id: walletId,
      capture_id: 1,
    });
    const token2 = new Token({
      id: token2Id,
      wallet_id: wallet2Id,
      capture_id: 2,
    });

    const wallet = new Wallet(walletId);
    const wallet2 = new Wallet(wallet2Id);


    it("limit parameters missed", async () => {
      const res = await request(app)
        .get("/");
      expect(res).property("statusCode").eq(422);
    });

    it("successfully, default wallet", async () => {
      sinon.stub(TokenService.prototype, "getByOwner").resolves([token, token2]);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      const res = await request(app)
        .get("/?limit=10&offset=1");
      expect(res).property("statusCode").eq(200);
      expect(res.body.tokens).lengthOf(1);
      expect(res.body.tokens[0]).property("id").eq(token2Id);
      expect(res.body.tokens[0]).property("links").property("capture").eq("/webmap/trees?treeid=2");
    });

    it("successfully, sub wallet", async () => {
      sinon.stub(TokenService.prototype, "getByOwner").resolves([token]);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      sinon.stub(WalletService.prototype, "getByName").resolves(wallet2);
      sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
      const res = await request(app)
        .get(`/?limit=10&wallet=${wallet2Id}`);
      expect(res).property("statusCode").eq(200);
      expect(res.body.tokens[0]).property("id").eq(tokenId);
      expect(res.body.tokens[0]).property("links").property("capture").eq("/webmap/trees?treeid=1");
    });

    it("sub wallet, no permission", async () => {
      sinon.stub(TokenService.prototype, "getByOwner").resolves([token]);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      sinon.stub(WalletService.prototype, "getByName").resolves(wallet2);
      sinon.stub(Wallet.prototype, "hasControlOver").resolves(false);
      const res = await request(app)
        .get("/?limit=10&wallet=B");
      expect(res).property("statusCode").eq(403);
    });
  });


  describe("get token, GET /:token_id/transactions", () => {

    const tokenId = uuid.v4()
    const token2Id = uuid.v4()
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const transactionId = uuid.v4()

    const token = new Token({
      id: tokenId,
      wallet_id: walletId,
      capture_id: 1,
    });
    const token2 = new Token({
      id: token2Id,
      wallet_id: wallet2Id,
      capture_id: 2,
    });

    const wallet = new Wallet(walletId);
    const wallet2 = new Wallet(wallet2Id);


    it("/test-uuid successfully", async () => {
      sinon.stub(TokenService.prototype, "getById").resolves(token);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      sinon.stub(Wallet.prototype, "getSubWallets").resolves([]);
      sinon.stub(TokenService.prototype, "convertToResponse").resolves({
        token: tokenId,
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
      });
      const res = await request(app)
        .get(`/${tokenId}`);
      expect(res).property("statusCode").eq(200);
      expect(res.body).property("id").eq(tokenId);
      expect(res.body).property("links").property("capture").eq("/webmap/trees?treeid=1");
    });

    it("/xxx/transactions successfully", async () => {
      sinon.stub(TokenService.prototype, "getById").resolves(token);
      sinon.stub(token, "toJSON").resolves({
        wallet_id: walletId,
      });
      sinon.stub(token, "getTransactions").resolves([{
        id: transactionId,
      }]);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      sinon.stub(TokenService.prototype, "convertToResponse").resolves({
        token: tokenId,
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
      });
      sinon.stub(Wallet.prototype, "getSubWallets").resolves([]);
      const res = await request(app)
        .get(`/${tokenId}/transactions/?limit=1`);
      expect(res).property("statusCode").eq(200);
      expect(res.body.history).lengthOf(1);
      expect(res.body.history[0]).property("token").eq(tokenId);
      expect(res.body.history[0]).property("sender_wallet").eq(walletId);
      expect(res.body.history[0]).property("receiver_wallet").eq(wallet2Id);
    });

    it("/{token_uuid}/transactions: limit parameters missed", async () => {
      const res = await request(app)
        .get(`/${transactionId}/transactions`);
      expect(res).property("statusCode").eq(422);
    });

    it("/{token_uuid}/transactions limit and offset successfully", async () => {
      sinon.stub(TokenService.prototype, "getById").resolves(token);
      sinon.stub(token, "toJSON").resolves({
        wallet_id: walletId,
      });
      sinon.stub(token, "getTransactions").resolves([
        {id: uuid.v4()}, {id: uuid.v4()}, {id: uuid.v4()}, {id: uuid.v4()}, {id: uuid.v4()}, {id: uuid.v4()}, {id: uuid.v4()}, {id: uuid.v4()}, {id: uuid.v4()}, {id: uuid.v4()}
      ]);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      sinon.stub(TokenService.prototype, "convertToResponse").resolves({
        token: tokenId,
        sender_wallet: authenticatedWallet,
        receiver_wallet: wallet2Id,
      }).onCall(4).resolves({
        token: tokenId,
        sender_wallet: "number5",
        receiver_wallet: "number5",
      }).onCall(5).resolves({
        token: tokenId,
        sender_wallet: "number6",
        receiver_wallet: "number6",
      }).onCall(6).resolves({
        token: tokenId,
        sender_wallet: "number7",
        receiver_wallet: "number7",
      });
      sinon.stub(Wallet.prototype, "getSubWallets").resolves([]);
      const res = await request(app)
        .get(`/${tokenId}/transactions?limit=3&offset=4`);
      expect(res).property("statusCode").eq(200);
      expect(res.body.history).lengthOf(3);
      expect(res.body.history[0]).property("sender_wallet").eq("number5");
      expect(res.body.history[0]).property("receiver_wallet").eq("number5");

      expect(res.body.history[1]).property("sender_wallet").eq("number6");
      expect(res.body.history[1]).property("receiver_wallet").eq("number6");

      expect(res.body.history[2]).property("sender_wallet").eq("number7");
      expect(res.body.history[2]).property("receiver_wallet").eq("number7");


    });
  });

});
