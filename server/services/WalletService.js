const { validate: uuidValidate } = require('uuid');
const Wallet = require('../models/Wallet');
const Session = require('../database/Session');

class WalletService {
  constructor() {
    this._session = new Session();
    this._wallet = new Wallet(this._session); // to remove
  }

  async getById(id) {
    const wallet = await this._wallet.getById(id);
    return wallet;
  }

  async getByName(name) {
    const wallet = await this._wallet.getByName(name);
    return wallet;
  }

  async getByIdOrName(idOrName) {
    let wallet;
    if (uuidValidate(idOrName)) {
      wallet = await this.getById(idOrName);
    } else {
      wallet = await this.getByName(idOrName);
    }
    return wallet;
  }
}

module.exports = WalletService;
