const {expect} = require("chai");
const mockKnex = require("mock-knex");
const TrustRepository = require("./TrustRepository");
const knex = require("../database/knex");

const tracker = mockKnex.getTracker();
const Session = require("../models/Session");
const uuid = require('uuid');


describe("TrustRepository", () => {
  let trustRepository;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    trustRepository = new TrustRepository(new Session());
  })

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it("get", async () => {
    tracker.on("query", (query) => {
      expect(query.sql).match(/select.*trust.*/);
      query.response([{
        id:1,
      }]);
    });
    const entity = await trustRepository.get();
    expect(entity).to.be.a("array");
  });

  it("create", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/insert.*trust.*/);
          query.response({});
        },
        function secondQuery() {
          expect(query.sql).match(/select.*trust.*order by.*/);
          query.response([{id:1}]);
        }
      ][step - 1]();
    });
    await trustRepository.create({id:uuid.v4(),state: "ok"});
  });

  it("getById", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on("query", (query) => {
      expect(query.sql).match(/select.*trust.*/);
      query.response([{}]);
    });
    await trustRepository.getById(1);
  });

  it("update", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on("query", (query) => {
      expect(query.sql).match(/update.*trust.*/);
      query.response([{}]);
    });
    await trustRepository.update({
      id:uuid.v4(),
      actor_wallet_id: uuid.v4(),
    });
  });
});

