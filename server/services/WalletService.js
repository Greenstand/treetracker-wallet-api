const { validate: uuidValidate } = require('uuid');
const Wallet = require('../models/Wallet');
const Session = require('../database/Session');
const TokenService = require('./TokenService');

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
      const addedWallet = await this._wallet.createWallet(
        loggedInWalletId,
        wallet,
      );

      return addedWallet.name;
    } catch (e) {
      if (this._session.isTransactionInProgress()) {
        await this._session.rollbackTransaction();
      }
      throw e;
    }
  }

  async getAllWallets(id, limitOptions, getTokenCount = true) {
    if (getTokenCount) {
      const tokenService = new TokenService(this._session);
      const wallets = await this._wallet.getAllWallets(id, limitOptions);
      return Promise.all(
        wallets.map(async (wallet) => {
          const json = { ...wallet };
          json.tokens_in_wallet = await tokenService.countTokenByWallet(
            wallet.id,
          );
          return json;
        }),
      );
    }
    return this._wallet.getAllWallets(id, limitOptions);
  }

  async hasControlOver(parentId, childId) {
    return this._wallet.hasControlOver(parentId, childId);
  }
}

module.exports = WalletService;
