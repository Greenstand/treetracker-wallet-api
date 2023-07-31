const log = require('loglevel');
const Session = require('../infra/database/Session');
const Transfer = require('../models/Transfer');
const HttpError = require('../utils/HttpError');
const WalletService = require('./WalletService');
const TokenService = require('./TokenService');
const TransferEnums = require('../utils/transfer-enum');
const Event = require('../models/Event');

class TransferService {
  constructor() {
    this._session = new Session();
    this._transfer = new Transfer(this._session);
    this._walletService = new WalletService();
    this._event = new Event(this._session);
  }

  async getByFilter(query, walletLoginId) {
    const { state, wallet, limit = 500, offset, before, after } = query;

    let walletId;

    if (wallet) {
      const walletDetails = await this._walletService.getByIdOrName(wallet);
      walletId = walletDetails.id;
    }

    const results = await this._transfer.getTransfers({
      state,
      walletId,
      offset,
      limit,
      walletLoginId,
      before,
      after,
    });

    return results;
  }

  async initiateTransfer(transferBody, walletLoginId) {
    // begin transaction
    try {
      await this._session.beginTransaction();
      const walletSender = await this._walletService.getByIdOrName(
        transferBody.sender_wallet,
      );
      const walletReceiver = await this._walletService.getByIdOrName(
        transferBody.receiver_wallet,
      );

      const { claim, bundle, tokens } = transferBody;

      let result;
      const gottentokens = [];
      // TODO: put the claim boolean into each tokens
      if (tokens) {
        const tokenService = new TokenService();
        await Promise.all(
          tokens.map(async (id) => {
            const token = await tokenService.getById({ id }, true);
            gottentokens.push(token);
          }),
        );
        // Case 1: with trust, token transfer

        // log.info(walletLoginId, walletSender, walletReceiver, gottentokens);
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

      const tokenArr = gottentokens.map((token) => token.id);

      let status;
      if (result.state === TransferEnums.STATE.completed) {
        // the log should show up on both sender and receiver
        await this._event.logEvent({
          loggedInWalletId: walletSender.id,
          type: 'transfer_completed',
          payload: tokens
            ? {
                walletSender: walletSender.name,
                walletReceiver: walletReceiver.name,
                tokenTransferred: tokenArr,
                claim,
              }
            : {
                walletSender: walletSender.name,
                walletReceiver: walletReceiver.name,
                bundle: bundle.bundle_size,
                claim,
              },
        });

        // the log should show up on both sender and receiver
        await this._event.logEvent({
          loggedInWalletId: walletReceiver.id,
          type: 'transfer_completed',
          payload: tokens
            ? {
                walletSender: walletSender.name,
                walletReceiver: walletReceiver.name,
                tokenTransferred: tokenArr,
                claim,
              }
            : {
                walletSender: walletSender.name,
                walletReceiver: walletReceiver.name,
                bundle: bundle.bundle_size,
                claim,
              },
        });

        status = 201;
      } else if (
        result.state === TransferEnums.STATE.pending ||
        result.state === TransferEnums.STATE.requested
      ) {
        // the log should show up on both sender and receiver
        await this._event.logEvent({
          loggedInWalletId: walletSender.id,
          type: 'transfer_requested',
          payload: tokens
            ? {
                walletSender: walletSender.name,
                walletReceiver: walletReceiver.name,
                tokenTransferred: tokenArr,
                claim,
              }
            : {
                walletSender: walletSender.name,
                walletReceiver: walletReceiver.name,
                bundle: bundle.bundle_size,
                claim,
              },
        });

        // the log should show up on both sender and receiver
        await this._event.logEvent({
          loggedInWalletId: walletReceiver.id,
          type: 'transfer_requested',
          payload: tokens
            ? {
                walletSender: walletSender.name,
                walletReceiver: walletReceiver.name,
                tokenTransferred: tokenArr,
                claim,
              }
            : {
                walletSender: walletSender.name,
                walletReceiver: walletReceiver.name,
                bundle: bundle.bundle_size,
                claim,
              },
        });

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

      const transfer = await this._transfer.getById({
        transferId,
        walletLoginId,
      });

      const originator_wallet_id = await this._walletService.getByName(
        transfer.originating_wallet,
      );
      const destination_wallet_id = await this._walletService.getByName(
        transfer.destination_wallet,
      );

      log.info(originator_wallet_id, destination_wallet_id);

      // TODO: claim
      const result = await this._transfer.acceptTransfer(
        transferId,
        walletLoginId,
      );

      await this._session.commitTransaction();

      // transfer completed
      // the log should show up on both sender and receiver
      await this._event.logEvent({
        loggedInWalletId: originator_wallet_id.id,
        type: 'transfer_completed',
        payload: { transferId },
      });

      // transfer completed
      // the log should show up on both sender and receiver
      await this._event.logEvent({
        loggedInWalletId: destination_wallet_id.id,
        type: 'transfer_completed',
        payload: { transferId },
      });

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

      const transfer = await this._transfer.getById({
        transferId,
        walletLoginId,
      });

      const originator_wallet_id = await this._walletService.getByName(
        transfer.originating_wallet,
      );

      const destination_wallet_id = await this._walletService.getByName(
        transfer.destination_wallet,
      );

      const result = await this._transfer.declineTransfer(
        transferId,
        walletLoginId,
      );

      await this._session.commitTransaction();

      // transfer request cancelled by destination
      // the log should show up on both sender and receiver
      await this._event.logEvent({
        loggedInWalletId: originator_wallet_id.id,
        type: 'transfer_request_cancelled_by_destination',
        payload: { transferId },
      });

      await this._event.logEvent({
        loggedInWalletId: originator_wallet_id.id,
        type: 'transfer_failed',
        payload: { transferId },
      });

      // transfer request cancelled by destination
      // the log should show up on both sender and receiver
      await this._event.logEvent({
        loggedInWalletId: destination_wallet_id.id,
        type: 'transfer_request_cancelled_by_destination',
        payload: { transferId },
      });

      await this._event.logEvent({
        loggedInWalletId: destination_wallet_id.id,
        type: 'transfer_failed',
        payload: { transferId },
      });

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

      const transfer = await this._transfer.getById({
        transferId,
        walletLoginId,
      });

      const originator_wallet_id = await this._walletService.getByName(
        transfer.originating_wallet,
      );

      const destination_wallet_id = await this._walletService.getByName(
        transfer.destination_wallet,
      );

      const result = await this._transfer.cancelTransfer(
        transferId,
        walletLoginId,
      );

      await this._session.commitTransaction();

      // transfer pending cancelled by requestor
      // the log should show up on both sender and receiver
      await this._event.logEvent({
        loggedInWalletId: originator_wallet_id.id,
        type: 'transfer_pending_cancelled_by_requestor',
        payload: { transferId },
      });

      await this._event.logEvent({
        loggedInWalletId: originator_wallet_id.id,
        type: 'transfer_failed',
        payload: { transferId },
      });

      // transfer pending cancelled by requestor
      // the log should show up on both sender and receiver
      await this._event.logEvent({
        loggedInWalletId: destination_wallet_id.id,
        type: 'transfer_pending_cancelled_by_requestor',
        payload: { transferId },
      });

      await this._event.logEvent({
        loggedInWalletId: destination_wallet_id.id,
        type: 'transfer_failed',
        payload: { transferId },
      });

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

      const transfer = await this._transfer.getById({
        transferId,
        walletLoginId,
      });

      const originator_wallet_id = await this._walletService.getByName(
        transfer.originating_wallet,
      );

      const destination_wallet_id = await this._walletService.getByName(
        transfer.destination_wallet,
      );

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

      // transfer completed
      // the log should show up on both sender and receiver
      await this._event.logEvent({
        loggedInWalletId: originator_wallet_id.id,
        type: 'transfer_completed',
        payload: { transferId },
      });

      // transfer completed
      // the log should show up on both sender and receiver
      await this._event.logEvent({
        loggedInWalletId: destination_wallet_id.id,
        type: 'transfer_completed',
        payload: { transferId },
      });

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
