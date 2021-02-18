const seed = require("./seed");
const pool = require("../server/database/database");
const {expect} = require("chai");
const Crypto = require('crypto');
const log = require("loglevel");
const knex = require("../server/database/knex");

describe("Seed data into DB", () => {
  let token;
  let tree;

  before(async () => {
    await seed.clear();
    await seed.seed();
    if(process.env.DATABASE_SCHEMA){
      knexConfig.searchPath = [process.env.DATABASE_SCHEMA]
    } else {
      knexConfig.searchPath = ['public']
    }

  });

  it("Should have api key", async () => {
    let r = await pool.query({
      text: `select * from api_key where key = $1`,
      values: [seed.apiKey]
    });
    expect(r).to.have.property('rows').that.have.lengthOf(1);
  });


  it("Should find a token", async () => {
    expect(seed.token).to.have.property('id');
    r = await pool.query(
      `select * from token where id = '${seed.token.id}'`
    )
    expect(r)
      .to.have.property('rows').to.have.lengthOf(1);
    token = r.rows[0];
    console.log('oo')
    console.log(token)
    expect(token)
      .to.have.property('capture_id')
      .to.equal(seed.capture.id);
    expect(token)
      .to.have.property('wallet_id')
      .to.equal(seed.wallet.id);
  });

  it("walletC exists", async () => {
    const r = await knex.table("wallet").select().where("name", seed.walletC.name);
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

  it("TokenB", async () => {
      const r = await knex.table("token").select()
        .where("id", seed.tokenB.id);
      expect(r).lengthOf(1); 
      console.log(r)
      expect(r[0]).property("capture_id").eq(seed.captureB.id);
  });

});

