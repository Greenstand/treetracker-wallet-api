const seed = require("./seed");
const pool = require("../server/database/database");
const {expect} = require("chai");
const Crypto = require('crypto');
const log = require("loglevel");

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

  describe("Should have a entity", () => {
    let r;

    before(async () => {
      r = await pool.query(
        `select * from entity where wallet = '${seed.entity.wallet}'`
      )
      expect(r)
        .to.have.property('rows').to.have.lengthOf(1);
    });

    it("should have a entity it's wallet == fortest", async () => {
      expect(r)
        .to.have.property('rows')
        .that.have.lengthOf(1)
        .that.property(0).to.have.property('id')
        .to.equal(10);
    });

    const sha512 = (password, salt) => {
      const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
      hash.update(password);
      const value = hash.digest('hex');
      return value;
    };

    it("Should be able to check the password", () => {
      expect(seed)
        .to.have.property('entity')
        .to.have.property('password')
        .to.be.a('string');
      expect(r)
        .to.have.property("rows")
        .to.have.property(0)
        .to.have.property("salt")
        .to.be.a("string");
      const hash = sha512(seed.entity.password, r.rows[0].salt);
      expect(r.rows[0])
        .to.have.property('password')
        .to.equal(seed.entity.passwordHash);
    });

  });


});

