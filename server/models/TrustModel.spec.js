const TrustModel = require("./TrustModel");
const {expect} = require("chai");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();
const knex = require("../database/knex");

describe("TrustModel", () => {

  before(() => {
    mockKnex.mock(knex);
    tracker.install();
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
    const trustModel = new TrustModel();
    const trust_relationships = await trustModel.get();
    expect(trust_relationships).lengthOf(1);
  });

});

