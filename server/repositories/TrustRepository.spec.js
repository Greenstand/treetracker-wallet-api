const TrustRepository = require("./TrustRepository");
const {expect} = require("chai");
const knex = require("../database/knex");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();


describe("TrustRepository", () => {
  let trustRepository;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    trustRepository = new TrustRepository();
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
    const result = await trustRepository.create({});
    expect(result).property('id').a('number');
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
    await trustRepository.update({id:1});
  });
});

