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

  describe("get /trust_relationships", () => {
    it("successfully", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(new Wallet(1));
      sinon.stub(TrustService.prototype, "convertToResponse").resolves({id:1});
      const fn = sinon.stub(Wallet.prototype, "getTrustRelationships").resolves([{}]);
      const res = await request(app)
        .get(`/?type=${TrustRelationship.ENTITY_TRUST_TYPE.send}&request_type=${TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send}&state=${TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted}`);
      expect(res).property("statusCode").eq(200);
      expect(res.body.trust_relationships).lengthOf(1);
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
