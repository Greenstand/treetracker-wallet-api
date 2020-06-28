const seed = require("./seed");
const pool = require("../server/database/database");
const {expect} = require("chai");

describe("Seed data into DB", () => {

  before(async () => {
    await seed.seed();
  });

  after(async ()  => {
    await seed.clear();
  });

  it("Should have api key", async () => {
    let r = await pool.query({
      text: `select * from api_key where key = $1`,
      values: [seed.apiKey]
    });
    expect(r).to.have.property('rows').that.have.lengthOf(1);
  });

  it("should have token data", async () => {
  });
});

