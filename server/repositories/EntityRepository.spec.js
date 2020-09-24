const EntityRepository = require("./EntityRepository");
const {expect} = require("chai");
const knex = require("../database/knex");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();
const jestExpect = require("expect");



describe("EntityRepository", () => {
  let entityRepository;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    entityRepository = new EntityRepository();
  })

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it("getEntityByWalletName", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on("query", (query) => {
      expect(query.sql).match(/select.*wallet.*/);
      query.response([{id:1}]);
    });
    const entity = await entityRepository.getEntityByWalletName("Dadior");
    expect(entity).to.be.a("object");
  });

  it("getEntityByWalletName can not find the wallet name", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on("query", (query) => {
      expect(query.sql).match(/select.*wallet.*/);
      query.response([]);
    });
    await jestExpect(async () => {
      await entityRepository.getEntityByWalletName("Dadior");
    }).rejects.toThrow(/can not find entity/);
  });
});

