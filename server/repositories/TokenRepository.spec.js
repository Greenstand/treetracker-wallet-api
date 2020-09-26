const knex = require("../database/knex");
const TokenRepository = require("./TokenRepository");
const sinon = require("sinon");
const {expect} = require("chai");

describe("TokenRepository", () => {
  let tokenRepository;

  beforeEach(() => {
    tokenRepository = new TokenRepository();
  })

  afterEach(() => {
  });

  it("get by uuid successfully", async () => {
    //NOTE, because seems like knex-mock can not mock knex.raw function, so 
    //here use sinon to mock it
    sinon.stub(knex, "raw").resolves([{
      uuid: "testUuid",
    }]);
    const tokens = await tokenRepository.getByUUID("testUuid");
    expect(tokens).lengthOf(1);
    expect(tokens[0]).property("token").eq("testUuid");
    knex.raw.restore();
  });

});
