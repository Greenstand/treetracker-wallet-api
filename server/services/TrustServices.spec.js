const TrustService = require("./TrustService");
const chai = require("chai");
const {expect} = chai;
const jestExpect = require("expect");
const sinon = require("sinon");
const TrustModel = require("../models/TrustModel");
const EntityModel = require("../models/EntityModel");

describe("TrustService", () => {
  let trustService;

  before(() => {
    trustService = new TrustService();
  });

  after(() => {
  });

  it("get trust_relationships", async () => {
    sinon.stub(TrustModel.prototype, "get").returns([{a:1}]);
    const trust_relationships = await trustService.getTrustModel().get();
    expect(trust_relationships).lengthOf(1);
  });


  describe("Request trust", () => {

    it("request with a wrong type would throw error", async () => {
      await jestExpect(async () => {
        await trustService.request("wrongType","test")
      }).rejects.toThrow();
    });

    it("request with a wrong wallet name would throw error", async () => {
      await jestExpect(async () => {
        await trustService.request("send","tes t");
      }).rejects.toThrow();
    });

    it("request successfully", async () => {
      sinon.stub(EntityModel.prototype, "getEntityByWalletName").returns([{id:1}]);
      sinon.stub(TrustModel.prototype, "create");
      await trustService.request("send", "test");
    });

  });


});

