const BaseRepository = require("./BaseRepository");
const {expect} = require("chai");
const knex = require("../database/knex");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();
const jestExpect = require("expect");

describe("BaseRepository", () => {
  let baseRepository;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    baseRepository = new BaseRepository("testTable");
  })

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it("getById", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on("query", (query) => {
      expect(query.sql).match(/select.*testTable.*/);
      query.response([{id:1}]);
    });
    const entity = await baseRepository.getById(1);
    expect(entity).property("id").eq(1);
  });

  describe("getByFilter", () => {

    it("getByFilter", async () => {
      tracker.uninstall();
      tracker.install();
      tracker.on("query", (query) => {
        expect(query.sql).match(/select.*testTable.*/);
        query.response([{id:1}]);
      });
      const result = await baseRepository.getByFilter({
        name: "testName",
      });
      expect(result).lengthOf(1);
      expect(result[0]).property("id").eq(1);
    });
  });
});
