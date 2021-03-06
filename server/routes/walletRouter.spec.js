const request = require("supertest");
const express = require("express");
const walletRouter = require("./walletRouter");
const {errorHandler} = require("./utils");
const sinon = require("sinon");
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const {expect} = chai;
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
  const authenticatedWallet = new Wallet({ id: uuid.v4() })
  const subWallet = new Wallet({ id: uuid.v4() })

  beforeEach(() => {
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "verify").returns({
      id: authenticatedWallet.id,
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
      sinon.stub(WalletService.prototype, "getById").resolves(mockWallet);
      sinon.stub(TrustService.prototype, "convertToResponse").resolves(mockTrust);
      sinon.stub(TokenService.prototype, "countTokenByWallet").resolves(10);
      const fn = sinon.stub(Wallet.prototype, "getSubWallets").resolves([ mockWallet2 ]);
      const res = await request(app)
        .get('/?limit=2');
      expect(res).property("statusCode").eq(200);
      expect(res.body.wallets).lengthOf(2);
      expect(res.body.wallets[0]).property("tokens_in_wallet").eq(10);
    });

    it("limit and offet working successfully", async () => {
      sinon.stub(WalletService.prototype, "getById").resolves(mockWallet);
      console.log(mockWallet.getId())
      console.log(mockWallet2.getId())
      console.log(mockWallet3.getId())
      console.log(mockWallet4.getId())
      sinon.stub(TrustService.prototype, "convertToResponse").resolves(mockTrust);
      sinon.stub(TokenService.prototype, "countTokenByWallet").resolves(10);
      const fn = sinon.stub(Wallet.prototype, "getSubWallets").resolves([ mockWallet2, mockWallet3, mockWallet4]);
      const res = await request(app)
        .get('/?limit=3&offset=1');
      expect(res).property("statusCode").eq(200);
      expect(res.body.wallets).lengthOf(3);
      console.log(authenticatedWallet.getId());
      console.log(res.body)
      expect(res.body.wallets[0]).property("tokens_in_wallet").eq(10);
      expect(res.body.wallets[0]).property("id").eq(mockWallet3.getId());
      expect(res.body.wallets[1]).property("id").eq(mockWallet4.getId());
      expect(res.body.wallets[2]).property("id").eq(mockWallet.getId());
    })

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
