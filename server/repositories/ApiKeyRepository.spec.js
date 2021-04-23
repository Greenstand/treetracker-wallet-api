const {expect} = require("chai");
const mockKnex = require("mock-knex");
const knex = require("../database/knex");

const tracker = mockKnex.getTracker();
const ApiKeyRepository = require("./ApiKeyRepository");
const Session = require("../models/Session");

describe("ApiKeyRepository", () => {
  let apiKeyRepository;
  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    apiKeyRepository = new ApiKeyRepository(new Session());
  })

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it("get by apiKey successfully", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on("query", (query) => {
      expect(query.sql).match(/select.*api_key.*/);
      query.response([{id:1}]);
    });
    const result = await apiKeyRepository.getByApiKey("test");
    return result;
  });
});
