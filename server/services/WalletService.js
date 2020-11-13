const WalletRepository = require('../repositories/WalletRepository');
const Wallet = require('../models/Wallet');
const HttpError = require("../utils/HttpError");
const expect = require('expect-runtime');

class WalletService {
  constructor() {
    this.walletRepository = new WalletRepository();
  }

  async getById(id) {
    const object = await this.walletRepository.getById(id);
    expect(object).match({ id: expect.any(Number) });
    const wallet = new Wallet(object.id);
    return wallet;
  }

  async getByName(name) {
    const object = await this.walletRepository.getByName(name);
    expect(object).match({ id: expect.any(Number) });
    const wallet = new Wallet(object.id);
    return wallet;
  }

  async getByIdOrName(idOrName) {
    let walletObject;
    if (typeof idOrName === 'number') {
      walletObject = await this.walletRepository.getById(idOrName);
    } else if (typeof idOrName === 'string') {
      walletObject = await this.walletRepository.getByName(idOrName);
    } else {
      throw new HttpError(404, `Type must be number or string: ${idOrName}`);
    }

    expect(walletObject).match({ id: expect.any(Number) });
    const wallet = new Wallet(walletObject.id);
    return wallet;
  }
}

module.exports = WalletService;
