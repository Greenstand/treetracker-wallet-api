const TokenService = require("./TokenService");
const sinon = require("sinon");
const TokenRepository = require("../repositories/TokenRepository");
const HttpError = require("../utils/HttpError");
const jestExpect = require("expect");
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const {expect} = chai;
const Wallet = require("../models/Wallet");
const Token = require("../models/Token");

describe("Token", () => {
  let tokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  })

  it("getByUUID() with id which doesn't exist, should throw 404", async () => {
    sinon.stub(TokenRepository.prototype, "getByUUID").rejects(new HttpError(404, "not found"));
    await jestExpect(async () => {
      await tokenService.getByUUID("testUuid");
    }).rejects.toThrow('not found');
    TokenRepository.prototype.getByUUID.restore();
  });

  it("getTokensByBundle", async () => {
    const wallet = new Wallet(1);
    const fn = sinon.stub(TokenRepository.prototype, "getByFilter").resolves([
      {
        id: 1,
      }
    ]);
    const result = await tokenService.getTokensByBundle(wallet, 1);
    expect(result).a("array").lengthOf(1);
    expect(result[0]).instanceOf(Token);
    expect(fn).calledWith({
      entity_id: 1,
    },{
      limit: 1,
    });
  });

  it("countTokenByWallet", async () => {
    const wallet = new Wallet(1);
    const fn = sinon.stub(TokenRepository.prototype, "countByFilter").resolves(1);
    const result = await tokenService.countTokenByWallet(wallet);
    expect(result).eq(1);
    expect(fn).calledWith({
      entity_id: 1,
    });
    fn.restore();
  });

});
