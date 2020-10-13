const WalletRepository = require("../repositories/WalletRepository");
const Wallet = require("../models/Wallet");
const expect = require("expect-runtime");

class WalletService{
  constructor(session){
    this.walletRepository = new WalletRepository(session);
    this._session = session;
  }

  async getById(id){
    const object = await this.walletRepository.getById(id);
    const wallet = new Wallet(object.id, this._session);
    return wallet;
  }

  async getByName(name){
    const object = await this.walletRepository.getByName(name);
    expect(object).match({id:expect.any(Number)});
    const wallet = new Wallet(object.id, this._session);
    return wallet;
  }
}

module.exports = WalletService;
