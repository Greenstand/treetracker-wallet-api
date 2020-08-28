const seed = require("./seed");
const pool = require("../server/database/database");
const {expect} = require("chai");
const Crypto = require('crypto');
const log = require("loglevel");

describe("Seed data into DB", () => {

  before(async () => {
    await seed.clear();
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


  describe("Should find a token", () => {
    let token;

    before(async () => {
      expect(seed.token).to.have.property('id');
      r = await pool.query(
        `select * from token where id = '${seed.token.id}'`
      )
      expect(r)
        .to.have.property('rows').to.have.lengthOf(1);
      token = r.rows[0];
    });

    it("Token should match tree/entity id", () => {
      expect(token)
        .to.have.property('tree_id')
        .to.equal(seed.tree.id);
      expect(token)
        .to.have.property('entity_id')
        .to.equal(seed.entity.id);
    });

  });


  describe(`Should have the entity ${seed.entity.id}`, () => {
    let r;

    before(async () => {
      r = await pool.query(
        `select * from entity where wallet = '${seed.entity.wallet}'`
      )
      expect(r)
        .to.have.property('rows').to.have.lengthOf(1);
    });

    it("is wallet should == fortest", async () => {
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

    it("Should have permission list_trees", async () => {
      const query = 
        `SELECT *
          FROM entity_role
          WHERE entity_id = ${seed.entity.id}
          AND role_name = 'list_trees'
          AND enabled = TRUE`;
      const result = await pool.query(query);
      log.debug("pg:", query);
      expect(result)
        .to.have.property("rows")
        .to.have.lengthOf(1);
    });

    it("Should have permission account", async () => {
      const query = 
        `SELECT *
          FROM entity_role
          WHERE entity_id = ${seed.entity.id}
          AND role_name = 'accounts'
          AND enabled = TRUE`;
      const result = await pool.query(query);
      log.debug("pg:", query);
      expect(result)
        .to.have.property("rows")
        .to.have.lengthOf(1);
    });
  });

  describe("Should have a tree", () => {
    let tree;

    before(async () => {
      let r = await pool.query({
        text: `select * from trees where id = ${tree.id}`,
        values: [seed.apiKey]
      });
      expect(r).to.have.property('rows').that.have.lengthOf(1);
    });

  });

});

