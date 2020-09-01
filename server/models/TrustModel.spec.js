const TrustModel = require("./TrustModel");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();
const knex = require("../database/knex");
const chai = require("chai");
const {expect} = chai;
const jestExpect = require("expect");

describe("TrustModel", () => {
  let trustModel;

  before(() => {
    mockKnex.mock(knex);
    tracker.install();
    trustModel = new TrustModel();
  });

  after(() => {
    mockKnex.unmock(knex);
    tracker.uninstall();
  });

  it("get trust_relationships", async () => {
    tracker.on("query", (query) => {
      expect(query.sql).match(/select.*trust_relationship.*/);
      query.response([{
        a:1,
      }]);
    });
    const trust_relationships = await trustModel.get();
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
      //TODO ? why must uninstall & install here?
      tracker.uninstall();
      tracker.install();
      tracker.on("query", (query) => {
        expect(query.sql).match(/insert.*trust_relationship.*/);
        query.response([]);
      });
      await trustModel.request("send", "test");
    });

  });


});

