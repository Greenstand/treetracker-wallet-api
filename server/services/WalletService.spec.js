const WalletService = require("./WalletService");
const WalletRepository = require("../repositories/WalletRepository");
const sinon = require("sinon");
const {expect} = require("chai");
const Wallet = require("../models/Wallet");
const Session = require("../models/Session");
const uuid = require('uuid');

describe("WalletService", () => {
  let walletService;
  let session = new Session();

  beforeEach(() => {
    walletService = new WalletService(session);
  })

  it("getById", async () => {
    const walletId1 = uuid.v4();
    sinon.stub(WalletRepository.prototype, "getById").resolves({id:walletId1});
    expect(walletService).instanceOf(WalletService);
    const wallet = await walletService.getById(walletId1);
    expect(wallet).instanceOf(Wallet);
    WalletRepository.prototype.getById.restore();
  });

  it("getByName", async () => {
    const walletId1 = uuid.v4();
    sinon.stub(WalletRepository.prototype, "getByName").resolves({id:walletId1});
    expect(walletService).instanceOf(WalletService);
    const wallet = await walletService.getByName("test");
    expect(wallet).instanceOf(Wallet);
    WalletRepository.prototype.getByName.restore();
  });
});

