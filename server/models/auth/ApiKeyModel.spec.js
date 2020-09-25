const ApiKeyModel = require("./ApiKeyModel");
const jestExpect = require("expect");
const sinon = require("sinon");
const ApiKeyRepository = require("../../repositories/ApiKeyRepository");
const HttpError = require("../../utils/HttpError");

describe("ApiKeyModel", () => {
  let apiKeyModel;

  before(() => {
    apiKeyModel = new ApiKeyModel();
  })

  it("empty key should throw error", async () => {
    await jestExpect(async () => {
      await apiKeyModel.check(undefined);
    }).rejects.toThrow(/no API key/);
  });

  it("key which do not exist should throw error", async () => {
    sinon.stub(ApiKeyRepository.prototype, "getByApiKey").throws(new HttpError(404));
    await jestExpect(async () => {
      await apiKeyModel.check("not_exist");
    }).rejects.toThrow(/Invalid/);
    ApiKeyRepository.prototype.getByApiKey.restore();
  });

  it("good key should pass", async () => {
    sinon.stub(ApiKeyRepository.prototype, "getByApiKey").returns({});
    await apiKeyModel.check("not_exist");
    ApiKeyRepository.prototype.getByApiKey.restore();
  });

});
