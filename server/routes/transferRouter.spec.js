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

describe("authRouter", () => {
  let app;
  const walletLogin = {
    id: 1,
  }

  before(() => {
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "verify").returns({
      id: walletLogin.id,
    });
    sinon.stub(WalletService.prototype, "getByName");
    sinon.stub(WalletService.prototype, "getById").resolves({
      transfer: () => {},
    });
    app = express();
    app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(bodyParser.json()); // parse application/json
    app.use(transferRouter);
    app.use(errorHandler);
  })

  after(() => {
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

  it("all parameters fine, should return 201", async () => {
    const res = await request(app)
      .post("/")
      .send({
        tokens: ["1"],
        sender_wallet: "ssss",
        receiver_wallet: "ssss",
      });
    expect(res).property("statusCode").eq(201);
  });

  it("all parameters fine, but no trust relationship, should return 202", async () => {
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


});
