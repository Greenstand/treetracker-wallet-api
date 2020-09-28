const Trust = require("./Trust");
const chai = require("chai");
const {expect} = chai;
const jestExpect = require("expect");
const sinon = require("sinon");
const TrustRepository = require("../repositories/TrustRepository");
const WalletRepository = require("../repositories/WalletRepository");

describe("Trust", () => {
  let trust;

  before(() => {
    trust = new Trust();
  });

  after(() => {
  });

  it("get trust_relationships", async () => {
    sinon.stub(TrustRepository.prototype, "get").returns([{a:1}]);
    const trust_relationships = await trust.getTrustModel().get();
    expect(trust_relationships).lengthOf(1);
    TrustRepository.prototype.get.restore();
  });


  describe("Request trust", () => {

    it("request with a wrong type would throw error", async () => {
      await jestExpect(async () => {
        await trust.request("wrongType","test")
      }).rejects.toThrow();
    });

    it("request with a wrong wallet name would throw error", async () => {
      await jestExpect(async () => {
        await trust.request("send","tes t");
      }).rejects.toThrow();
    });

    it("request successfully", async () => {
      sinon.stub(WalletRepository.prototype, "getByName").returns([{id:1}]);
      sinon.stub(TrustRepository.prototype, "create");
      await trust.request("send", "test");
      WalletRepository.prototype.getByName.restore();
      TrustRepository.prototype.create.restore();
    });
  });

  describe("Accept trust", () => {

    it("accept", async () => {
      sinon.stub(TrustRepository.prototype, "getById").returns([{id:1}]);
      sinon.stub(TrustRepository.prototype, "update");
      const trustRelationshipId = 1;
      await trust.accept(trustRelationshipId);
      TrustRepository.prototype.getById.restore();
      TrustRepository.prototype.update.restore();
    });
  });

});

