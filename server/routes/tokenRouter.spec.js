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

describe("tokenRouter", () => {
  let app;
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
    app.use(tokenRouter);
    app.use(errorHandler);
  })

  afterEach(() => {
    sinon.restore();
  })

  it("/xxx/transactions successfully", async () => {
    const token = new Token(1);
    const wallet = new Wallet(1);
    sinon.stub(TokenService.prototype, "getByUUID").resolves(token);
    sinon.stub(token, "toJSON").resolves({
      entity_id: 1,
    });
    sinon.stub(token, "getTransactions").resolves([{
      id: 1,
    }]);
    sinon.stub(WalletService.prototype, "getById").resolves(wallet);
    sinon.stub(TokenService.prototype, "convertToResponse").resolves({
      token: "xxx",
      sender_wallet: "test",
      receiver_wallet: "test",
    });
    const res = await request(app)
      .get("/xxxx/transactions");
    expect(res).property("statusCode").eq(200);
    expect(res.body.history).lengthOf(1);
    expect(res.body.history[0]).property("token").eq("xxx");
    expect(res.body.history[0]).property("sender_wallet").eq("test");
    expect(res.body.history[0]).property("receiver_wallet").eq("test");
  });

});
