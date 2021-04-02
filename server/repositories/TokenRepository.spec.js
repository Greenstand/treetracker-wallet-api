const knex = require("../database/knex");
const TokenRepository = require("./TokenRepository");
const sinon = require("sinon");
const {expect} = require("chai");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();
const Session = require("../models/Session");

describe("TokenRepository", () => {
  let tokenRepository;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    tokenRepository = new TokenRepository(new Session());
  })

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });


  it("getByTransferId", async () => {
    tracker.on("query", (query) => {
      expect(query.sql).match(/select.*token.*transaction.*transfer_id/is);
      query.response([{id:1, token: "testUuid"}]);
    });
    const tokens = await tokenRepository.getByTransferId('226f76cd-52b0-486b-b58a-98230696c748');
    expect(tokens).lengthOf(1);
  });

});
