const seed = require("./seed");
const pool = require("../server/database/database");
const {expect} = require("chai");
const Crypto = require('crypto');
const log = require("loglevel");
const knex = require("../server/database/knex");

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
        .to.have.property('capture_id')
        .to.equal(seed.tree.id);
      expect(token)
        .to.have.property('wallet_id')
        .to.equal(seed.wallet.id);
    });

  });


//  describe(`Should have the entity ${seed.wallet.id}`, () => {
//    let r;
//
//    before(async () => {
//      r = await pool.query(
//        `select * from entity where wallet = '${seed.wallet.name}'`
//      )
//      expect(r)
//        .to.have.property('rows').to.have.lengthOf(1);
//    });
//
//    it("is wallet should == fortest", async () => {
//      expect(r)
//        .to.have.property('rows')
//        .that.have.lengthOf(1)
//        .that.property(0).to.have.property('id')
//        .to.equal(10);
//    });
//
//    const sha512 = (password, salt) => {
//      const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
//      hash.update(password);
//      const value = hash.digest('hex');
//      return value;
//    };
//
//    it("Should be able to check the password", () => {
//      expect(seed)
//        .to.have.property('wallet')
//        .to.have.property('password')
//        .to.be.a('string');
//      expect(r)
//        .to.have.property("rows")
//        .to.have.property(0)
//        .to.have.property("salt")
//        .to.be.a("string");
//      const hash = sha512(seed.wallet.password, r.rows[0].salt);
//      expect(r.rows[0])
//        .to.have.property('password')
//        .to.equal(seed.wallet.passwordHash);
//    });
//
//    it("Should have permission list_trees", async () => {
//      const query = 
//        `SELECT *
//          FROM entity_role
//          WHERE wallet_id = ${seed.wallet.id}
//          AND role_name = 'list_trees'
//          AND enabled = TRUE`;
//      const result = await pool.query(query);
//      log.debug("pg:", query);
//      expect(result)
//        .to.have.property("rows")
//        .to.have.lengthOf(1);
//    });
//
//    it("Should have permission account", async () => {
//      const query = 
//        `SELECT *
//          FROM entity_role
//          WHERE wallet_id = ${seed.wallet.id}
//          AND role_name = 'accounts'
//          AND enabled = TRUE`;
//      const result = await pool.query(query);
//      log.debug("pg:", query);
//      expect(result)
//        .to.have.property("rows")
//        .to.have.lengthOf(1);
//    });
//  });

  describe("walletC", () => {

    it("walletC exists", async () => {
      const r = await knex.table("wallets.wallet").select().where("name", seed.walletC.name);
      expect(r).lengthOf(1);
    });

    it("walletC have manage relationship with wallet", async () => {
      const r = await knex.table("wallet_trust").select()
        .where({
          actor_wallet_id: seed.walletB.id,
          target_wallet_id: seed.walletC.id,
          type: "manage",
        });
      expect(r).lengthOf(1); 
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

  it("TokenB", async () => {
      const r = await knex.table("wallets.token").select()
        .where("id", seed.tokenB.id);
      expect(r).lengthOf(1); 
      expect(r[0]).property("capture_id").eq(seed.treeB.id);
  });

});

