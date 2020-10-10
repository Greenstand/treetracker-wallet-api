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

    it("getByFilter with limit", async () => {
      tracker.uninstall();
      tracker.install();
      tracker.on("query", (query) => {
        expect(query.sql).match(/select.*testTable.*limit.*/);
        query.response([{id:1}]);
      });
      const result = await baseRepository.getByFilter({
        name: "testName",
      },{
        limit: 1,
      });
      expect(result).lengthOf(1);
      expect(result[0]).property("id").eq(1);
    });
  });

  describe("update", () => {

    it("update", async () => {
      tracker.uninstall();
      tracker.install();
      tracker.on("query", (query) => {
        expect(query.sql).match(/update.*testTable.*/);
        query.response({id:1});
      });
      const result = await baseRepository.update({
        id: 1,
        name: "testName",
      });
      expect(result).property("id").eq(1);
    });
  });

  describe("create", () => {

    it("create", async () => {
      tracker.uninstall();
      tracker.install();
      tracker.on("query", (query) => {
        expect(query.sql).match(/insert.*testTable.*returning.*/);
        query.response([{id:1}]);
      });
      const result = await baseRepository.create({
        name: "testName",
      });
      expect(result).property("id").eq(1);
    });
  });

  describe("countByFilter", () => {

    it("", async () => {
      tracker.uninstall();
      tracker.install();
      tracker.on("query", (query) => {
        expect(query.sql).match(/.*count.*column.*/);
        query.response([{
          count: "1",
        }]);
      });
      const result = await baseRepository.countByFilter({
        column: "testColumn",
      });
      expect(result).eq(1);
    });
  });
});
