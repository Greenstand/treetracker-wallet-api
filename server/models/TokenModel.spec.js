const TokenModel = require("./TokenModel");
const jestExpect = require("expect");
const sinon = require("sinon");
const TokenRepository = require("../repositories/TokenRepository");
const HttpError = require("../utils/HttpError");

describe("TokenModel", () => {
  let tokenModel;

  beforeEach(() => {
    tokenModel = new TokenModel();
  })

  it("getByUUID() with id which doesn't exist, should throw 404", async () => {
    sinon.stub(TokenRepository.prototype, "getByUUID").rejects(new HttpError(404, "not found"));
    await jestExpect(async () => {
      await tokenModel.getByUUID("testUuid");
    }).rejects.toThrow('not found');
    TokenRepository.prototype.getByUUID.restore();
  });

});
