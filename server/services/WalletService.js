const { validate: uuidValidate } = require('uuid');
const Wallet = require('../models/Wallet');
const Session = require('../infra/database/Session');
const Token = require('../models/Token');

class WalletService {
  constructor() {
    this._session = new Session();
    this._wallet = new Wallet(this._session);
  }

  async getSubWallets(id) {
    return this._wallet.getSubWallets(id);
  }

  async getById(id) {
    return this._wallet.getById(id);
  }

  async getByName(name) {
    return this._wallet.getByName(name);
  }

  async getWallet(walletId) {
    return this._wallet.getWallet(walletId);
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

  async createWallet(loggedInWalletId, wallet) {
    try {
      await this._session.beginTransaction();

      const addedWallet = await this._wallet.createWallet(
        loggedInWalletId,
        wallet,
      );

      await this._session.commitTransaction();

      return { wallet: addedWallet.name, id: addedWallet.id };
    } catch (e) {
      if (this._session.isTransactionInProgress()) {
        await this._session.rollbackTransaction();
      }
      throw e;
    }
  }

  async getAllWallets(id, limitOptions, name = '', getTokenCount = true) {
    if (getTokenCount) {
      const token = new Token(this._session);
      const wallets = await this._wallet.getAllWallets(id, limitOptions, name);
      return Promise.all(
        wallets.map(async (wallet) => {
          const json = { ...wallet };
          json.tokens_in_wallet = await token.countTokenByWallet(wallet.id);
          return json;
        }),
      );
    }
    return this._wallet.getAllWallets(id, limitOptions);
  }

  async getAllWalletsCount(id, name = '') {
    return this._wallet.getAllWalletsCount(id, name);
  }

  async hasControlOver(parentId, childId) {
    return this._wallet.hasControlOver(parentId, childId);
  }
}

module.exports = WalletService;
