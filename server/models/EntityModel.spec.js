const EntityModel = require("./EntityModel");
const {expect} = require("chai");
const knex = require("../database/knex");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();
const jestExpect = require("expect");



describe("EntityModel", () => {
  let entityModel;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    entityModel = new EntityModel();
  })

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it("getEntityByWalletName", async () => {
    tracker.on("query", (query) => {
      console.log("xxx");
      expect(query.sql).match(/select.*entity.*/);
      query.response([{
        id:1,
      }]);
    });
    const entity = await entityModel.getEntityByWalletName("Dadior");
    expect(entity).to.be.a("object");
  });

  it.only("getEntityByWalletName can not find the wallet name", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on("query", (query) => {
      console.log("xxx");
      expect(query.sql).match(/select.*entity.*/);
      query.response([]);
    });
    await jestExpect(async () => {
      await entityModel.getEntityByWalletName("Dadior");
    }).rejects.toThrow(/can not find entity/);
  });
});

