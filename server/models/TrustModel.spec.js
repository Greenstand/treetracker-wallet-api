const TrustModel = require("./TrustModel");
const {expect} = require("chai");
const knex = require("../database/knex");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();


describe("TrustModel", () => {
  let trustModel;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    trustModel = new TrustModel();
  })

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it.only("get", async () => {
    tracker.on("query", (query) => {
      expect(query.sql).match(/select.*trust.*/);
      query.response([{
        id:1,
      }]);
    });
    const entity = await trustModel.get();
    expect(entity).to.be.a("array");
  });

  it.only("create", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on("query", (query) => {
      expect(query.sql).match(/insert.*trust.*/);
      query.response({});
    });
    await trustModel.create({});
  });
});

