const WalletRepository = require('../repositories/WalletRepository');
const Wallet = require('../models/Wallet');
const HttpError = require('../utils/HttpError');
const expect = require('expect-runtime');
const { validate: uuidValidate } = require('uuid');
const csvtojson = require('csvtojson');
const fs = require('fs').promises;
const TokenService = require('./TokenService');

class WalletService {
  constructor(session) {
    this._session = session;
    this.walletRepository = new WalletRepository(session);
  }

  async getById(id) {
    const object = await this.walletRepository.getById(id);
    const wallet = new Wallet(object.id, this._session);
    return wallet;
  }

  async getByName(name) {
    const object = await this.walletRepository.getByName(name);
    const wallet = new Wallet(object.id, this._session);
    return wallet;
  }

  async getByIdOrName(idOrName) {
    let walletObject;
    if (uuidValidate(idOrName)) {
      walletObject = await this.walletRepository.getById(idOrName);
    } else if (typeof idOrName === 'string') {
      walletObject = await this.walletRepository.getByName(idOrName);
    } else {
      throw new HttpError(404, `Type must be number or string: ${idOrName}`);
    }
    const wallet = new Wallet(walletObject.id, this._session);
    return wallet;
  }

  async processBatchWallets({
    body,
    file,
    loggedInWallet,
    csvValidationSchema,
  }) {
    let jsonResult;
    // validations
    try {
      jsonResult = await csvtojson().fromFile(file.path);

      await csvValidationSchema.validateAsync(jsonResult, {
        abortEarly: false,
      });
    } catch (e) {
      await fs.unlink(file.path);
      throw e;
    }

    try {
      await this._session.beginTransaction();

      const senderWalletName = body?.sender_wallet;
      let senderWallet;
      if (senderWalletName) {
        senderWallet = await this.getByName(senderWalletName);
      }
      const defaultTokenAmount = body?.token_transfer_amount_default;

      const walletPromises = [];
      let totalAmountToTransfer = 0;

      for (const {
        wallet_name,
        token_transfer_amount_overwrite,
      } of jsonResult) {
        if (token_transfer_amount_overwrite && !senderWalletName) {
          throw new HttpError(422, 'sender_wallet is required for transfer');
        }
        const amount = token_transfer_amount_overwrite || defaultTokenAmount;
        totalAmountToTransfer += +amount;

        walletPromises.push(loggedInWallet.addManagedWallet(wallet_name));
      }
      const tokenService = new TokenService(this._session);

      let walletsCreatedCount = 0;
      let walletsAlreadyExistsFailureCount = 0;
      let walletsOtherFailureCount = 0;

      const walletsCreated = [];

      const walletsPromise = await Promise.allSettled(walletPromises);

      const tokenCount = await tokenService.countTokenByWallet(senderWallet);
      if (totalAmountToTransfer > tokenCount)
        throw new HttpError(422, 'sender does not have enough tokens');

      for (const { status, value, reason } of walletsPromise) {
        if (status === 'fulfilled') {
          walletsCreated.push(value);
          walletsCreatedCount += 1;
        } else {
          if (reason.toString().match(/.*has.*been.*existed/g)) {
            walletsAlreadyExistsFailureCount += 1;
          } else {
            walletsOtherFailureCount += 1;
          }
        }
      }

      for (const wallet of walletsCreated) {
        const receiverWallet = await this.getByName(wallet.name);
        const walletDetails = jsonResult.find(
          (w) => w.wallet_name === wallet.name,
        );
        const amountToTransfer =
          walletDetails.token_transfer_amount_overwrite || defaultTokenAmount;
        if (amountToTransfer) {
          await loggedInWallet.transferBundle(
            senderWallet,
            receiverWallet,
            amountToTransfer,
          );
        }
      }

      await this._session.commitTransaction();

      await fs.unlink(file.path);

      return {
        wallets_created: walletsCreatedCount,
        wallets_already_exists: walletsAlreadyExistsFailureCount,
        wallet_other_failure_count: walletsOtherFailureCount,
      };
    } catch (e) {
      await this._session.rollbackTransaction();
      await fs.unlink(file.path);
      throw e;
    }
  }
}

module.exports = WalletService;
