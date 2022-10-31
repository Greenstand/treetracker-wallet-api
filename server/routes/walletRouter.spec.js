const request = require("supertest");
const express = require("express");
const sinon = require("sinon");
const chai = require("chai");
const sinonChai = require("sinon-chai");
const uuid = require('uuid');
const bodyParser = require('body-parser');
const walletRouter = require("./walletRouter");
const {errorHandler} = require("./utils");

chai.use(sinonChai);
const {expect} = chai;
const ApiKeyService = require("../services/ApiKeyService");
const WalletService = require("../services/WalletService");
const TokenService = require("../services/TokenService");
const TrustService = require("../services/TrustService");
const JWTService = require("../services/JWTService");
const HttpError = require("../utils/HttpError");
const Wallet = require("../models/Wallet");


describe("walletRouter", ()=> {
  let app;
  const authenticatedWallet = new Wallet({ id: uuid.v4() })
  const subWallet = new Wallet({ id: uuid.v4() })

  beforeEach(() => {
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "verify").returns({
      id: authenticatedWallet.getId(),
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
    const mockWallet = new Wallet({ id: uuid.v4() })
    const mockWallet2 = new Wallet({ id: uuid.v4(), name: "test-wallet-2" })
    const mockWallet3 = new Wallet({ id: uuid.v4() })
    const mockWallet4 = new Wallet({ id: uuid.v4() })
    const mockTrust = { id: uuid.v4() }

    it("limit parameters missed", async () => {
      const res = await request(app)
        .get("/");
      expect(res).property("statusCode").eq(422);
    });

    it("successfully", async () => {
      const w1 = await mockWallet.toJSON();
      const w2 = await mockWallet2.toJSON();
      const f1 = sinon.stub(WalletService.prototype, "getSubWalletList").resolves([{...w1, tokens_in_wallet:1}, {...w2, tokens_in_wallet:2}]);
      const res = await request(app)
        .get('/?limit=2');
      expect(res).property("statusCode").eq(200);
      expect(res.body.wallets).lengthOf(2);
      expect(res.body.wallets[0]).property("tokens_in_wallet").eq(1);
      expect(f1).calledWith(authenticatedWallet.getId(), 0, 2);
    });

    it("should omit private fields", async () => {
      const wallet = new Wallet({
        "id":  uuid.v4(),
        "type": "p",
        "name": "name",
        "password": "private field",
        "salt": "private field",
        "tokens_in_wallet": 10
    })
      const walletJson = await wallet.toJSON();
      const f1 = sinon.stub(WalletService.prototype, "getSubWalletList").resolves([{...walletJson, tokens_in_wallet:1}]);
      const res = await request(app)
        .get('/?limit=2');
      expect(res).property("statusCode").eq(200);
      expect(res.body.wallets).lengthOf(1);
      const resWallet = res.body.wallets[0]
      expect(resWallet).not.to.contain.keys(['password', 'salt', 'type'])
    });

  })

  describe("get /wallets/:wallet_id/trust_relationships", () => {
    const mockWallet = new Wallet(uuid.v4())
    const mockTrust = { id: uuid.v4() }

    it("successfully", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(mockWallet);
      sinon.stub(TrustService.prototype, "convertToResponse").resolves(mockTrust);
      const fn = sinon.stub(Wallet.prototype, "getTrustRelationships").resolves([ mockTrust ]);
      const res = await request(app)
        .get(`/${mockWallet.getId()}/trust_relationships`);
      expect(res).property("statusCode").eq(200);
      expect(res.body.trust_relationships).lengthOf(1);
    });
  })

  describe("post /wallets", () => {
    const mockWallet = new Wallet(uuid.v4())
    const mockWallet2 = new Wallet({ id: uuid.v4(), name: "test-wallet-2"})
    const mockTrust = { id: uuid.v4() }

    it("successfully creates managed wallet", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(mockWallet);
      const fn = sinon.stub(Wallet.prototype, "addManagedWallet").resolves(mockWallet2._JSON);
      const res = await request(app)
        .post("/")
        .send({
          wallet: mockWallet2._JSON.name
        });
      console.log(res.body);
      expect(res).property("statusCode").eq(200);
      expect(res.body).to.have.property("wallet").eq(mockWallet2._JSON.name);
      expect(fn).calledWith(mockWallet2._JSON.name);
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
