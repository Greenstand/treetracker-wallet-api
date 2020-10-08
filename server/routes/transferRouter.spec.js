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

describe("authRouter", () => {
  let app;
  const walletLogin = {
    id: 1,
  }

  beforeEach(() => {
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "verify").returns({
      id: walletLogin.id,
    });
    sinon.stub(WalletService.prototype, "getByName");
    sinon.stub(WalletService.prototype, "getById").resolves({
      transfer: () => {},
    });
    sinon.stub(TokenService.prototype, "getByUUID").resolves(new Token(1));
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
    expect(res.body.message[0].message).match(/token.*required/);
  });

  it("missing sender wallet should throw error", async () => {
    const res = await request(app)
      .post("/")
      .send({
        tokens: ["1"],
        receiver_wallet: "ssss",
      });
    expect(res).property("statusCode").eq(422);
    expect(res.body.message[0].message).match(/sender.*required/);
  });


});
