const seed = require("./seed");
const { expect } = require("chai");
const knex = require("./knex");

describe("Seed data into DB", () => {
  let token;

  it("Should have api key", async () => {
    const r = await knex.table("api_key").select().where("key", seed.apiKey);
    expect(r).lengthOf(1);
  });

  it("Should find a token in walletA", async () => {
    expect(seed.token).to.have.property("id");
    const r = await knex.table("token").select().where("id", seed.token.id);
    expect(r).lengthOf(1);
    token = r[0];
    expect(token).to.have.property("wallet_id").to.equal(seed.wallet.id);
  });

  it("walletA exists", async () => {
    const r = await knex
      .table("wallet")
      .select()
      .where("name", seed.wallet.name);
    expect(r).lengthOf(1);
  });

  it("walletB exists", async () => {
    const r = await knex
        .table("wallet")
        .select()
        .where("name", seed.walletB.name);
    expect(r).lengthOf(1);
  });

  it("walletC exists", async () => {
    const r = await knex
        .table("wallet")
        .select()
        .where("name", seed.walletC.name);
    expect(r).lengthOf(1);
  });

  it("Future trust walletD exists", async () => {
    const r = await knex
        .table("wallet")
        .select()
        .where("name", seed.walletTrustD.name);
    expect(r).lengthOf(1);
  });

  it("Future trust walletE exists", async () => {
    const r = await knex
        .table("wallet")
        .select()
        .where("name", seed.walletTrustE.name);
    expect(r).lengthOf(1);
  });

  it("Future managing walletF exists", async () => {
    const r = await knex
        .table("wallet")
        .select()
        .where("name", seed.managingWallet.name);
    expect(r).lengthOf(1);
  });
});