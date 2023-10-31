const { validate: uuidValidate } = require('uuid');
const Wallet = require('../models/Wallet');
const Session = require('../infra/database/Session');
const Token = require('../models/Token');
// const EventService = require('./EventService');
const EventEnums = require('../utils/event-enum');
const Event = require('../models/Event');
const HttpError = require('../utils/HttpError');

class WalletService {
  constructor() {
    this._session = new Session();
    this._wallet = new Wallet(this._session);
    this._event = new Event(this._session);
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

      // log event for the newly created wallet
      await this._event.logEvent({
        wallet_id: addedWallet.id,
        type: EventEnums.WALLET.wallet_created,
        payload: {
          parentWallet: loggedInWalletId,
          childWallet: addedWallet.name,
        },
      });

      // log event for the parent wallet
      await this._event.logEvent({
        wallet_id: loggedInWalletId,
        type: EventEnums.WALLET.wallet_created,
        payload: {
          parentWallet: loggedInWalletId,
          childWallet: addedWallet.name,
        },
      });

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
    return this._wallet.getAllWallets(id, limitOptions, name, getWalletCount);
  }

  async hasControlOver(parentId, childId) {
    return this._wallet.hasControlOver(parentId, childId);
  }

  async hasControlOverByName(parentId, childName) {
    //
    const walletInstance = await this._walletService.getByName(childName);
    const isSub = await this._walletService.hasControlOver(
      parentId,
      childName.id,
    );
    if (!isSub) {
      throw new HttpError(
        403,
        'Wallet does not belong to the logged in wallet',
      );
    }

    return walletInstance;
  }
}

module.exports = WalletService;
