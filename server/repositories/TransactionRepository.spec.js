const TransactionRepository = require("./TransactionRepository");
const {expect} = require("chai");
const knex = require("../database/knex");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();
const jestExpect = require("expect");
const Session = require("../models/Session");

describe("TransactionRepository", () => {
  let transactionRepository;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    transactionRepository = new TransactionRepository(new Session());
  })

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });


  it("getById", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on("query", (query) => {
      expect(query.sql).match(/select.*transaction.*/);
      query.response({id:1});
    });
    const entity = await transactionRepository.getById(1);
    expect(entity).to.be.a("object");
  });
});
