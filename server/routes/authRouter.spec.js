const request = require("supertest");
const express = require("express");
const authRouter = require("./authRouter");
const {expect} = require("chai");
const {errorHandler} = require("./utils");
const sinon = require("sinon");
const ApiKeyService = require("../services/ApiKeyService");
const bodyParser = require('body-parser');
const WalletService = require("../services/WalletService");
const JWTService = require("../services/JWTService");

describe("authRouter", () => {
  let app;

  before(() => {
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "sign");
    sinon.stub(WalletService.prototype, "getByName").resolves({
      authorize: () => ({id:1}),
    });
    app = express();
    app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(bodyParser.json()); // parse application/json
    app.use(authRouter);
    app.use(errorHandler);
  })

  after(() => {
    sinon.restore();
  })

  it("wallet: 123 should throw error", async () => {
    const res = await request(app)
      .post("/")
      .send({
        wallet: 123,
        password: "xxx",
      });
    expect(res).property("statusCode").eq(422);
    expect(res.body.message[0].message).match(/must/);
  });

});
