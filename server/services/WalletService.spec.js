const WalletService = require("./WalletService");
const WalletRepository = require("../repositories/WalletRepository");
const sinon = require("sinon");
const {expect} = require("chai");
const Wallet = require("../models/Wallet");

describe("WalletService", () => {
  let walletService;

  beforeEach(() => {
    walletService = new WalletService();
  })

  it("getById", async () => {
    sinon.stub(WalletRepository.prototype, "getById").resolves({id:1});
    expect(walletService).instanceOf(WalletService);
    const wallet = await walletService.getById(1);
    expect(wallet).instanceOf(Wallet);
    WalletRepository.prototype.getById.restore();
  });

  it("getByName", async () => {
    sinon.stub(WalletRepository.prototype, "getByName").resolves({id:1});
    expect(walletService).instanceOf(WalletService);
    const wallet = await walletService.getByName("test");
    expect(wallet).instanceOf(Wallet);
    WalletRepository.prototype.getByName.restore();
  });
});

