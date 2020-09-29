const Wallet = require("./Wallet");
const {expect} = require("chai");
const jestExpect = require("expect");
const sinon = require("sinon");
const WalletRepository = require("../repositories/WalletRepository");
const WalletService = require("../services/WalletService");
const HttpError = require("../utils/HttpError");

describe("Wallet", () => {
  let walletService;

  beforeEach(() => {
    walletService = new WalletService();
  })

  it("authorize() with empty parameters should get 400 error", async () => {
    sinon.stub(WalletRepository.prototype, "getByName").resolves({id:1});
    const wallet = await walletService.getByName("test");
    expect(wallet).instanceOf(Wallet);
    await jestExpect(async () => {
      await wallet.authorize(undefined);
    }).rejects.toThrow(/invalid/i);
    WalletRepository.prototype.getByName.restore();
  });

  it("authorize() with wallet which doesn't exists, should throw 401", async () => {
    sinon.stub(WalletRepository.prototype, "getByName").rejects(new HttpError(404, "not found"));
    await jestExpect(async () => {
      const wallet = await walletService.getByName("test");
      await wallet.authorize(undefined);
    }).rejects.toThrow(/not found/);
    WalletRepository.prototype.getByName.restore();
  });


  it("authorize() with correct wallet, password, should return a wallet object", async () => {
    const walletObject = {
      id:1, 
      salt:"salet",
      password: "testPasswordHash",
    };
    sinon.stub(WalletRepository.prototype, "getByName").resolves(walletObject);
    sinon.stub(WalletRepository.prototype, "getById").resolves(walletObject);
    sinon.stub(Wallet, "sha512").returns("testPasswordHash");
    const wallet = await walletService.getByName("testWallet");
    const walletObjectResult = await wallet.authorize("testPassword");
    expect(walletObjectResult).property("id").eq(1);
    WalletRepository.prototype.getByName.restore();
    WalletRepository.prototype.getById.restore();
    Wallet.sha512.restore();
  });

});
