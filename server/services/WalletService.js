const WalletRepository = require("../repositories/WalletRepository");
const Wallet = require("../models/Wallet");
const expect = require("expect-runtime");

class WalletService{
  constructor(){
    this.walletRepository = new WalletRepository();
  }

  async getById(id){
    const object = await this.walletRepository.getById(id);
    const wallet = new Wallet(object.id);
    return wallet;
  }

  async getByName(name){
    const object = await this.walletRepository.getByName(name);
    expect(object).match({id:expect.any(Number)});
    const wallet = new Wallet(object.id);
    return wallet;
  }
}

module.exports = WalletService;
