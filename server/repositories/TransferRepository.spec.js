const TransferRepository = require("./TransferRepository");
const {expect} = require("chai");
const knex = require("../database/knex");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();


describe("TransferRepository", () => {
  let transferRepository;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    transferRepository = new TransferRepository();
  })

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it("create", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/insert.*transfer.*/);
          query.response({id:1});
        }
      ][step - 1]();
    });
    const result = await transferRepository.create({
      originator_entity_id: 1,
      source_entity_id: 2,
      destination_entity_id: 3,
    });
    expect(result).property('id').a('number');
  });

  it("getById", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/select.*transfer.*/);
          query.response({id:1});
        },
      ][step - 1]();
    });
    const result = await transferRepository.getById(1);
    expect(result).property("id").eq(1);
  });

  it("getPendingTransfers", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/select.*transfer.*where.*destination_entity_id.*/);
          query.response([{id:1}]);
        },
      ][step - 1]();
    });
    const result = await transferRepository.getPendingTransfers(1);
    expect(result).lengthOf(1);
  });

});

