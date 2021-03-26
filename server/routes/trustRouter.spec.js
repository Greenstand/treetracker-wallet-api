const request = require("supertest");
const express = require("express");
const trustRouter = require("./trustRouter");
const {errorHandler} = require("./utils");
const sinon = require("sinon");
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const {expect} = chai;
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
const uuid = require('uuid');

describe("trustRouter", () => {
  let app;
  const authenticatedWallet = new Wallet(uuid.v4())

  beforeEach(() => {
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "verify").returns({
      id: authenticatedWallet.getId(),
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
    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const wallet = new Wallet(walletId);
    const wallet2 = new Wallet(wallet2Id);

    it("successfully", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(authenticatedWallet);
      sinon.stub(WalletService.prototype, "getByName").resolves(wallet);
      const fn = sinon.stub(Wallet.prototype, "requestTrustFromAWallet");
      sinon.stub(TrustService.prototype, "convertToResponse").resolves({});
      const res = await request(app)
        .post("/")
        .send({
          trust_request_type: "send",
          requestee_wallet: walletId,
        });
      console.log(res.body);
      expect(res).property("statusCode").eq(200);
      expect(fn).calledWith(
        "send",
        authenticatedWallet,
        wallet
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
      sinon.stub(WalletService.prototype, "getByName").resolves(wallet);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      const res = await request(app)
        .post("/")
        .send({
          trust_request_type: "sendError",
          requestee_wallet: "wallet",
        });
      expect(res).property("statusCode").eq(422);
    });

  });

  describe("get /trust_relationships", () => {

    const walletId = uuid.v4()
    const wallet2Id = uuid.v4()
    const wallet = new Wallet(walletId);
    const wallet2 = new Wallet(wallet2Id);
    const trustId = uuid.v4()

    it("successfully", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(new Wallet(walletId));
      sinon.stub(TrustService.prototype, "convertToResponse").resolves({id:trustId});
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
      sinon.stub(WalletService.prototype, "getById").resolves(new Wallet(walletId));
      sinon.stub(TrustService.prototype, "convertToResponse").resolves({id:trustId});
      const fn = sinon.stub(Wallet.prototype, "getTrustRelationships").resolves([{},{},{}]);
      const res = await request(app)
        .get(`/?type=${TrustRelationship.ENTITY_TRUST_TYPE.send}&request_type=${TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send}&state=${TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted}&limit=3`);

      expect(fn).calledWith(
        TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
        TrustRelationship.ENTITY_TRUST_TYPE.send,
        TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
        0,
        3
      )
      expect(res).property("statusCode").eq(200);
      expect(res.body.trust_relationships).lengthOf(3);
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
