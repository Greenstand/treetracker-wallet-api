const request = require("supertest");
const express = require("express");
const trustRouter = require("./trustRouter");
const {expect} = require("chai");
const {errorHandler} = require("./utils");
const sinon = require("sinon");
const ApiKeyService = require("../services/ApiKeyService");
const bodyParser = require('body-parser');
const WalletService = require("../services/WalletService");
const TrustService = require("../services/TrustService");
const JWTService = require("../services/JWTService");
const HttpError = require("../utils/HttpError");
const Token = require("../models/Token");
const TokenService = require("../services/TokenService");
const Wallet = require("../models/Wallet");
const TrustRelationship = require("../models/TrustRelationship");

describe("trustRouter", () => {
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
    app.use(trustRouter);
    app.use(errorHandler);
  })

  afterEach(() => {
    sinon.restore();
  })

  describe("post /trust_relationships", () => {

    it("successfully", async () => {
      const wallet = new Wallet(1);
      const wallet2 = new Wallet(2);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      sinon.stub(WalletService.prototype, "getByName").resolves(wallet2);
      const fn = sinon.stub(Wallet.prototype, "requestTrustFromAWallet");
      sinon.stub(TrustService.prototype, "convertToResponse").resolves({});
      const res = await request(app)
        .post("/")
        .send({
          trust_request_type: "send",
          requestee_wallet: "test",
        });
      expect(res).property("statusCode").eq(200);
      expect(fn).calledWith(
        "send",
        wallet,
        wallet2,
      )
    });
    
    it("missed parameters", async () => {
      const res = await request(app)
        .post("/")
        .send({
        });
      expect(res).property("statusCode").eq(422);
    });

    it("missed parameters", async () => {
      const res = await request(app)
        .post("/")
        .send({
          trust_request_type: "send",
        });
      expect(res).property("statusCode").eq(422);
    });

    it("wrong parameters", async () => {
      const wallet = new Wallet(1);
      sinon.stub(WalletService.prototype, "getByName").resolves(wallet);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      const res = await request(app)
        .post("/")
        .send({
          trust_request_type: "sendError",
          requestee_wallet: "wallet",
        });
      expect(res).property("statusCode").eq(400);
    });

  });

  describe("get /trust_relationships", () => {

    it("successfully", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(new Wallet(1));
      sinon.stub(TrustService.prototype, "convertToResponse").resolves({id:1});
      const fn = sinon.stub(Wallet.prototype, "getTrustRelationships").resolves([{}]);
      const res = await request(app)
        .get(`/?type=${TrustRelationship.ENTITY_TRUST_TYPE.send}&request_type=${TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send}&state=${TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted}&limit=1`);
      expect(res).property("statusCode").eq(200);
      expect(res.body.trust_relationships).lengthOf(1);
      expect(fn).calledWith(
        TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
        TrustRelationship.ENTITY_TRUST_TYPE.send,
        TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send
      )
    });

    it("limit and offset working successfully", async () => {
      // TODO: need to update the test
      sinon.stub(WalletService.prototype, "getById").resolves(new Wallet(1));
      sinon.stub(TrustService.prototype, "convertToResponse").resolves({id:1});
      const fn = sinon.stub(Wallet.prototype, "getTrustRelationships").resolves([{},{},{},{}]);
      const res = await request(app)
        .get(`/?type=${TrustRelationship.ENTITY_TRUST_TYPE.send}&request_type=${TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send}&state=${TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted}&limit=3`);
      expect(res).property("statusCode").eq(200);
      console.log(res.body.trust_relationships);
      //get 3 from 4 items
      expect(res.body.trust_relationships).lengthOf(3);
      expect(fn).calledWith(
        TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
        TrustRelationship.ENTITY_TRUST_TYPE.send,
        TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send
      )
    });
    
    //TODO 
    it.skip("wrong state string should throw 422", () => {
    });

    //TODO 
    it.skip("wrong type string should throw 422", () => {
    });

    //TODO 
    it.skip("wrong request_type string should throw 422", () => {
    });

  });


});
