const { validate: uuidValidate } = require('uuid');
const fs = require('fs').promises;
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

  async getAllWallets(
    id,
    limitOptions,
    name,
    sort_by,
    order,
    created_at_start_date,
    created_at_end_date,
    getTokenCount = true,
    getWalletCount = true,
  ) {
    if (getTokenCount) {
      const token = new Token(this._session);
      const { wallets, count } = await this._wallet.getAllWallets(
        id,
        limitOptions,
        name,
        getWalletCount,
      );
      return {
        wallets: await Promise.all(
          wallets.map(async (wallet) => {
            const json = { ...wallet };
            json.tokens_in_wallet = await token.countTokenByWallet(wallet.id);
            return json;
          }),
        ),
        count,
      };
    }
    return this._wallet.getAllWallets(
      id,
      limitOptions,
      name,
      sort_by,
      order,
      created_at_start_date,
      created_at_end_date,
      getWalletCount,
    );
  }

  async hasControlOver(parentId, childId) {
    return this._wallet.hasControlOver(parentId, childId);
  }

  async batchCreateWallet(
    sender_wallet,
    token_transfer_amount_default,
    wallet_id,
    csvJson,
    filePath,
  ) {
    try {
      await this._session.beginTransaction();

      const result = await this._wallet.batchCreateWallet(
        sender_wallet,
        token_transfer_amount_default,
        wallet_id,
        csvJson,
      );

      await this._session.commitTransaction();
      await fs.unlink(filePath);

      return result;
    } catch (e) {
      if (this._session.isTransactionInProgress()) {
        await this._session.rollbackTransaction();
      }
      await fs.unlink(filePath);
      throw e;
    }
  }
}

module.exports = WalletService;
