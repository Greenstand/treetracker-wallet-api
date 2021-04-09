/*
 * Test session mechanism
 */
const jestExpect = require("expect");
const sinon = require("sinon");
const chai = require("chai");
const sinonChai = require("sinon-chai");
const Session = require("../server/models/Session");
const seed = require('./seed');

chai.use(sinonChai);
const {expect} = chai;


describe("Session integration", () => {
  beforeEach(async () => {
    // before all, seed data to DB
    await seed.clear();
    await seed.seed();

  });

  afterEach(async () => {
    await seed.clear();
  });

  it("get normal DB connection", async () => {
    const session = new Session();
    await session.getDB()("api_key").insert({key:"testKey"});
    const result = await session.getDB().select().from("api_key"); 
    expect(result).lengthOf(2);
  });

  it("Use transaction, and commit", async () => {
    const session = new Session();
    await session.beginTransaction();
    await session.getDB()("api_key").insert({key:"testKey"});
    const result = await session.getDB().select().from("api_key"); 
    await session.commitTransaction();
    expect(result).lengthOf(2);
  });

  it("Use transaction, rollback", async () => {
    const session = new Session();
    await session.beginTransaction();
    await session.getDB()("api_key").insert({key:"testKey"});
    await session.rollbackTransaction();
    const result = await session.getDB().select().from("api_key"); 
    expect(result).lengthOf(1);
  });

  it("Use transaction, nest case", async () => {
    const session = new Session();
    await session.beginTransaction();

    await jestExpect(async () => {
        await session.beginTransaction();
    }).rejects.toThrow(/transaction/);
  });
});
