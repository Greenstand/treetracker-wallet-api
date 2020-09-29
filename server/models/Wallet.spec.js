const Wallet = require("./Wallet");
const jestExpect = require("expect");
const sinon = require("sinon");
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const {expect} = chai;
const WalletRepository = require("../repositories/WalletRepository");
const TrustRepository = require("../repositories/TrustRepository");
const WalletService = require("../services/WalletService");
const HttpError = require("../utils/HttpError");

describe("Wallet", () => {
  let walletService;
  let wallet;
  const walletObject = {
    id:1, 
    salt:"salet",
    password: "testPasswordHash",
  };

  beforeEach(() => {
    wallet = new Wallet(1);
    walletService = new WalletService();
  })

  it("authorize() with empty parameters should get 400 error", async () => {
    sinon.stub(WalletRepository.prototype, "getByName").resolves({id:1});
    const wallet = await walletService.getByName("test");
    expect(wallet).instanceOf(Wallet);
    await jestExpect(async () => {
      await wallet.authorize(undefined);
    }).rejects.toThrow(/invalid/i);
    WalletRepository.prototype.getByName.restore();
  });

  it("authorize() with wallet which doesn't exists, should throw 401", async () => {
    sinon.stub(WalletRepository.prototype, "getByName").rejects(new HttpError(404, "not found"));
    await jestExpect(async () => {
      const wallet = await walletService.getByName("test");
      await wallet.authorize(undefined);
    }).rejects.toThrow(/not found/);
    WalletRepository.prototype.getByName.restore();
  });


  it("authorize() with correct wallet, password, should return a wallet object", async () => {
    sinon.stub(WalletRepository.prototype, "getById").resolves(walletObject);
    sinon.stub(Wallet, "sha512").returns("testPasswordHash");
    const walletObjectResult = await wallet.authorize("testPassword");
    expect(walletObjectResult).property("id").eq(1);
    WalletRepository.prototype.getById.restore();
    Wallet.sha512.restore();
  });


  it("getTrustRelationshipsRequested", async () => {
    const fnGet = sinon.stub(TrustRepository.prototype, "getByOriginatorId").resolves([]);
    const trust_relationships = await wallet.getTrustRelationshipsRequested();
    expect(trust_relationships).lengthOf(0);
    expect(fnGet).to.have.been.calledWith(wallet.getId());
    fnGet.restore();
  });

  describe("Request trust", () => {
    let wallet;

    beforeEach(() => {
      wallet = new Wallet(1);
    })

    it("request with a wrong type would throw error", async () => {
      await jestExpect(async () => {
        await wallet.requestTrustFromAWallet("wrongType","test")
      }).rejects.toThrow("type");
    });

    it("request with a wrong wallet name would throw error", async () => {
      await jestExpect(async () => {
        await wallet.requestTrustFromAWallet("send","tes t");
      }).rejects.toThrow(/name/i);
    });

    it("request with trust which has existed should throw 403", async () => {
      const getByName = sinon.stub(WalletRepository.prototype, "getByName").resolves({id:2});
      const getByOriginatorId = sinon.stub(TrustRepository.prototype, "getByOriginatorId").resolves([{
        type:'send',
        target_entity_id: 2,
      }]);
      await jestExpect(async () => {
        await wallet.requestTrustFromAWallet("send","test");
      }).rejects.toThrow(/existed/i);
      getByName.restore();
      getByOriginatorId.restore();
    });

    it("request successfully", async () => {
      const fn1 = sinon.stub(WalletRepository.prototype, "getByName").resolves({id:2});
      const fn2 = sinon.stub(TrustRepository.prototype, "get").resolves([]);
      const fn3 = sinon.stub(TrustRepository.prototype, "create");
      await wallet.requestTrustFromAWallet("send","test");
      expect(fn3).to.have.been.calledWith(
        sinon.match({
          actor_entity_id: 1,
          originator_entity_id: 1,
        }),
      );
      fn1.restore();
      fn2.restore();
      fn3.restore();
    });
  });

  describe("Accept trust", () => {
    let wallet;

    beforeEach(() => {
      wallet = new Wallet(1);
    })

    it("accept", async () => {
      sinon.stub(TrustRepository.prototype, "getById").returns([{id:1}]);
      sinon.stub(TrustRepository.prototype, "update");
      const trustRelationshipId = 1;
      await wallet.acceptTrustRequestSentToMe(trustRelationshipId);
      TrustRepository.prototype.getById.restore();
      TrustRepository.prototype.update.restore();
    });
  });

});
