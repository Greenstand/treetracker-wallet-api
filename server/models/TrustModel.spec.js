const TrustModel = require("./TrustModel");
const chai = require("chai");
const {expect} = chai;
const jestExpect = require("expect");
const sinon = require("sinon");
const TrustRepository = require("../repositories/TrustRepository");
const EntityRepository = require("../repositories/EntityRepository");

describe("TrustModel", () => {
  let trustModel;

  before(() => {
    trustModel = new TrustModel();
  });

  after(() => {
  });

  it("get trust_relationships", async () => {
    sinon.stub(TrustRepository.prototype, "get").returns([{a:1}]);
    const trust_relationships = await trustModel.getTrustModel().get();
    expect(trust_relationships).lengthOf(1);
  });


  describe("Request trust", () => {

    it("request with a wrong type would throw error", async () => {
      await jestExpect(async () => {
        await trustModel.request("wrongType","test")
      }).rejects.toThrow();
    });

    it("request with a wrong wallet name would throw error", async () => {
      await jestExpect(async () => {
        await trustModel.request("send","tes t");
      }).rejects.toThrow();
    });

    it("request successfully", async () => {
      sinon.stub(EntityRepository.prototype, "getEntityByWalletName").returns([{id:1}]);
      sinon.stub(TrustRepository.prototype, "create");
      await trustModel.request("send", "test");
    });
  });

  describe("Accept trust", () => {

    it("accept", async () => {
      sinon.stub(TrustRepository.prototype, "getById").returns([{id:1}]);
      sinon.stub(TrustRepository.prototype, "update");
      const trustRelationshipId = 1;
      await trustModel.accept(trustRelationshipId);
    });
  });

});

