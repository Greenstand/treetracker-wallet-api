const Session = require('../infra/database/Session');
const Transfer = require('../models/Transfer');
const HttpError = require('../utils/HttpError');
const WalletService = require('./WalletService');
const TokenService = require('./TokenService');
const TransferEnums = require('../utils/transfer-enum');

class TransferService {
  constructor() {
    this._session = new Session();
    this._transfer = new Transfer(this._session);
    this._walletService = new WalletService();
  }

  async getByFilter(query, walletLoginId) {
    const { state, wallet, limit, offset, before, after, getCount = true } = query;

    let walletId;

    if (wallet) {
      const walletDetails = await this._walletService.getByIdOrName(wallet);
      walletId = walletDetails.id;
    }

    const {transfers, count}= await this._transfer.getTransfers({
      state,
      walletId,
      offset,
      limit,
      walletLoginId,
      before,
      after,
      getCount
    });


    return {transfers, count};
  }

  async initiateTransfer(transferBody, walletLoginId) {
    // begin transaction
    try {
      await this._session.beginTransaction();

      if (transferBody.sender_wallet === transferBody.receiver_wallet) {
        throw new HttpError(
          422,
          'Cannot transfer to the same wallet as the originating one!',
        );
      }
      
      const walletSender = await this._walletService.getByIdOrName(
        transferBody.sender_wallet,
      );
      const walletReceiver = await this._walletService.getByIdOrName(
        transferBody.receiver_wallet,
      );

      const { claim, bundle, tokens } = transferBody;

      let result;

      // TODO: put the claim boolean into each tokens
      if (tokens) {
        const gottentokens = [];
        const tokenService = new TokenService();
        await Promise.all(
          tokens.map(async (id) => {
            const token = await tokenService.getById({ id }, true);
            gottentokens.push(token);
          }),
        );
        // Case 1: with trust, token transfer
        result = await this._transfer.transfer(
          walletLoginId,
          walletSender,
          walletReceiver,
          gottentokens,
          claim,
        );
      } else {
        // Case 2: with trust, bundle transfer
        // TODO: get only transferrable tokens
        result = await this._transfer.transferBundle(
          walletLoginId,
          walletSender,
          walletReceiver,
          bundle.bundle_size,
          claim,
        );
      }

      let status;
      if (result.state === TransferEnums.STATE.completed) {
        status = 201;
      } else if (
        result.state === TransferEnums.STATE.pending ||
        result.state === TransferEnums.STATE.requested
      ) {
        status = 202;
      } else {
        throw new Error(`Unexpected state ${result.state}`);
      }
      await this._session.commitTransaction();
      return { status, result };
    } catch (e) {
      if (this._session.isTransactionInProgress()) {
        await this._session.rollbackTransaction();
      }
      throw e;
    }
  }

  async acceptTransfer(transferId, walletLoginId) {
    try {
      await this._session.beginTransaction();

      // TODO: claim
      const result = await this._transfer.acceptTransfer(
        transferId,
        walletLoginId,
      );

      await this._session.commitTransaction();

      return result;
    } catch (e) {
      if (this._session.isTransactionInProgress()) {
        await this._session.rollbackTransaction();
      }
      throw e;
    }
  }

  async declineTransfer(transferId, walletLoginId) {
    try {
      await this._session.beginTransaction();

      const result = await this._transfer.declineTransfer(
        transferId,
        walletLoginId,
      );

      await this._session.commitTransaction();
      return result;
    } catch (e) {
      if (this._session.isTransactionInProgress()) {
        await this._session.rollbackTransaction();
      }
      throw e;
    }
  }

  async cancelTransfer(transferId, walletLoginId) {
    try {
      await this._session.beginTransaction();

      const result = await this._transfer.cancelTransfer(
        transferId,
        walletLoginId,
      );

      await this._session.commitTransaction();
      return result;
    } catch (e) {
      if (this._session.isTransactionInProgress()) {
        await this._session.rollbackTransaction();
      }
      throw e;
    }
  }

  async fulfillTransfer(walletLoginId, transferId, requestBody) {
    try {
      await this._session.beginTransaction();

      let result;
      if (requestBody.implicit) {
        result = await this._transfer.fulfillTransfer(
          transferId,
          walletLoginId,
        );
      } else {
        // load tokens
        const tokens = [];
        const tokenService = new TokenService();
        await Promise.all(
          requestBody.tokens.map(async (id) => {
            const token = await tokenService.getById({ id }, true);
            tokens.push(token);
          }),
        );
        result = await this._transfer.fulfillTransferWithTokens(
          transferId,
          tokens,
          walletLoginId,
        );
      }
      await this._session.commitTransaction();
      return result;
    } catch (e) {
      if (this._session.isTransactionInProgress()) {
        await this._session.rollbackTransaction();
      }
      throw e;
    }
  }

  async getTransferById(transferId, walletLoginId) {
    const transfer = await this._transfer.getById({
      transferId,
      walletLoginId,
    });
    if (!transfer) {
      throw new HttpError(
        404,
        'Can not find this transfer or it is not related to this wallet',
      );
    }
    return transfer;
  }

  async getTokensByTransferId(transferId, limit, offset) {
    const transfer = await this.getTransferById(transferId);
    const tokenService = new TokenService();
    let tokens;
    if (transfer.state === TransferEnums.STATE.completed) {
      tokens = await tokenService.getTokensByTransferId(
        transfer.id,
        limit,
        offset,
      );
    } else {
      tokens = await tokenService.getTokensByPendingTransferId(
        transfer.id,
        limit,
        offset,
      );
    }
    return tokens;
  }
}

module.exports = TransferService;
