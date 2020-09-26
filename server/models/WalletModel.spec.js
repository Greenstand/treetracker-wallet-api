const WalletModel = require("./WalletModel");
const {expect} = require("chai");
const jestExpect = require("expect");
const sinon = require("sinon");
const WalletRepository = require("../repositories/WalletRepository");
const HttpError = require("../utils/HttpError");

describe("WalletModel", () => {
  let walletModel;

  beforeEach(() => {
    walletModel = new WalletModel();
  })

  it("authorize() with empty parameters should get 400 error", async () => {
      await jestExpect(async () => {
        await walletModel.authorize(undefined, undefined);
      }).rejects.toThrow();
  });

  it("authorize() with wallet which doesn't exists, should throw 401", async () => {
    sinon.stub(WalletRepository.prototype, "getByName").rejects(new HttpError(404));
      await jestExpect(async () => {
        await walletModel.authorize(undefined, undefined);
      }).rejects.toThrow();
    WalletRepository.prototype.getByName.restore();
  });

  it("authorize() with bad password, should throw 401", async () => {
    sinon.stub(WalletRepository.prototype, "getByName").resolves({id:1});
    await jestExpect(async () => {
      await walletModel.authorize("testWallet", "testPassword");
    }).rejects.toThrow();
    WalletRepository.prototype.getByName.restore();
  });

  it("authorize() with correct wallet, password, should return a wallet object", async () => {
    sinon.stub(WalletRepository.prototype, "getByName").resolves({
      id:1, 
      salt:"salet",
      password: "testPasswordHash",
    });
    sinon.stub(WalletModel, "sha512").returns("testPasswordHash");
    const wallet = await walletModel.authorize("testWallet", "testPassword");
    expect(wallet).property("id").eq(1);
    WalletRepository.prototype.getByName.restore();
    WalletModel.sha512.restore();
  });

});
