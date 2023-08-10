const expect = require('expect-runtime');
const Joi = require('joi');
const log = require('loglevel');
const Wallet = require('./Wallet');
const TransferRepository = require('../repositories/TransferRepository');
const Token = require('./Token');
const Trust = require('./Trust');
const TransferEnums = require('../utils/transfer-enum');
const TrustRelationship = require('../utils/trust-enums');
const HttpError = require('../utils/HttpError');

class Transfer {
  constructor(session) {
    this._transferRepository = new TransferRepository(session);
    this._wallet = new Wallet(session);
    this._token = new Token(session);
    this._trust = new Trust(session);
  }

  static removeWalletIds(transferObject) {
    const transferObjectCopy = { ...transferObject };
    delete transferObjectCopy.originator_wallet_id;
    delete transferObjectCopy.source_wallet_id;
    delete transferObjectCopy.destination_wallet_id;

    return transferObjectCopy;
  }

  async getByFilter(filter, limitOptions, getCount) {
    const {count, result} = await this._transferRepository.getByFilter(
      filter,
      limitOptions,
      getCount
    );

    const transfers =  result.map((t) => this.constructor.removeWalletIds(t));

    return { transfers, count }
  }

  async getById({ transferId, walletLoginId }) {
    const transfers = await this.getTransfers({ walletLoginId, transferId });
    return transfers[0];
  }

  async update(transferObject) {
    const transfer = await this._transferRepository.update(transferObject);
    return this.constructor.removeWalletIds(transfer);
  }

  async create(transferObject) {
    const transfer = await this._transferRepository.create(transferObject);
    return this.constructor.removeWalletIds(transfer);
  }

  /*
   * Get all transfers belongs to me
   */
  async getTransfers({
    state,
    walletId,
    offset,
    limit,
    walletLoginId,
    transferId,
    before,
    after,
    getCount
  }) {
    const filter = {
      and: [],
    };
    filter.and.push({
      or: [
        { source_wallet_id: walletLoginId },
        { destination_wallet_id: walletLoginId },
        { originator_wallet_id: walletLoginId },
      ],
    });
    if (state) {
      filter.and.push({ state });
    }
    if (walletId) {
      filter.and.push({
        or: [
          { source_wallet_id: walletId },
          { destination_wallet_id: walletId },
          { originator_wallet_id: walletId },
        ],
      });
    }
    if (transferId) {
      filter.and.push({ 'transfer.id': transferId });
    }
    if (before) {
      filter.and.push({ before: { 'transfer.created_at': before } });
    }
    if (after) {
      filter.and.push({ after: { 'transfer.created_at': after } });
    }
    return this.getByFilter(filter, { offset, limit }, getCount);
  }

  /*
   * Check if it is deduct, if true, throw 403, cause we do not support it yet
   */
  async isDeduct(parentId, sender) {
    if (parentId === sender.id) {
      return false;
    }
    const result = await this._wallet.hasControlOver(parentId, sender.id);
    if (result) {
      return false;
    }
    return true;
  }

  /*
   * Transfer some tokens from the sender to receiver
   */
  async transfer(walletLoginId, sender, receiver, tokens, claimBoolean) {
    //    await this.checkDeduct(sender, receiver);

    // check tokens
    const tokensId = [];
    tokens.forEach((token) => {
      const tokenBelongsToSender = Token.belongsTo(token, sender.id);
      const tokenAbleToTransfer = Token.beAbleToTransfer(token);

      if (!tokenBelongsToSender) {
        throw new HttpError(
          403,
          `The token ${token.id} does not belong to the sender wallet`,
        );
      }

      if (!tokenAbleToTransfer) {
        throw new HttpError(
          403,
          `The token ${token.id} cannot be transferred for some reason--for example, it is part of another pending transfer`,
        );
      }
      if (token.claim) {
        throw new HttpError(
          403,
          `The token ${token.id} is claimed, cannot be transfered`,
        );
      }

      tokensId.push(token.id);
    });

    const isDeduct = await this.isDeduct(walletLoginId, sender);
    const hasTrust = await this._trust.hasTrust(
      walletLoginId,
      TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
      sender,
      receiver,
    );
    const hasControlOverSender = await this._wallet.hasControlOver(
      walletLoginId,
      sender.id,
    );
    const hasControlOverReceiver = await this._wallet.hasControlOver(
      walletLoginId,
      receiver.id,
    );
    // If has the trust, and is not deduct request (now, if wallet request some token from another wallet, can not pass the transfer directly)
    if (
      (hasControlOverSender && hasControlOverReceiver) ||
      (!isDeduct && hasTrust)
    ) {
      const transfer = await this.create({
        originator_wallet_id: walletLoginId,
        source_wallet_id: sender.id,
        destination_wallet_id: receiver.id,
        state: TransferEnums.STATE.completed,
        parameters: {
          tokens: tokensId,
        },
        // TODO: add boolean for claim in transferRepository
        claim: claimBoolean,
      });
      log.debug('now, deal with tokens');
      await this._token.completeTransfer(tokens, transfer, claimBoolean);
      return this.constructor.removeWalletIds(transfer);

      // TODO: Do I need claim boolean in below cases?
    }

    if (hasControlOverSender) {
      log.debug('OK, no permission, source under control, now pending it');

      const transfer = await this.create({
        originator_wallet_id: walletLoginId,
        source_wallet_id: sender.id,
        destination_wallet_id: receiver.id,
        state: TransferEnums.STATE.pending,
        parameters: {
          tokens: tokensId,
        },
        claim: claimBoolean,
      });
      await this._token.pendingTransfer(tokens, transfer);
      return this.constructor.removeWalletIds(transfer);
    }

    if (hasControlOverReceiver) {
      log.debug('OK, no permission, receiver under control, now request it');

      const transfer = await this.create({
        originator_wallet_id: walletLoginId,
        source_wallet_id: sender.id,
        destination_wallet_id: receiver.id,
        state: TransferEnums.STATE.requested,
        parameters: {
          tokens: tokensId,
        },
        claim: claimBoolean,
      });
      await this._token.pendingTransfer(tokens, transfer);
      return this.constructor.removeWalletIds(transfer);
    }
    // TODO
    return expect.fail();
  }

  async transferBundle(
    walletLoginId,
    sender,
    receiver,
    bundleSize,
    claimBoolean,
  ) {
    // check has enough tokens to sender
    // const tokenCount = await this._token.countTokenByWallet(sender.id); // tokenCount not in use???
    // count number of tokens not claimed
    const notClaimedTokenCount = await this._token.countNotClaimedTokenByWallet(
      sender.id,
    );
    // if(tokenCount < bundleSize){
    // throw new HttpError(403, `Do not have enough tokens to send`);
    // }
    // console.log(notClaimedTokenCount);
    if (notClaimedTokenCount < bundleSize) {
      throw new HttpError(403, `Do not have enough tokens to send`);
    }

    const isDeduct = await this.isDeduct(walletLoginId, sender);

    // If has the trust, and is not deduct request (now, if wallet request some token from another wallet, can not pass the transfer directly)
    const hasTrust = await this._trust.hasTrust(
      walletLoginId,
      TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
      sender,
      receiver,
    );

    const hasControlOverSender = await this._wallet.hasControlOver(
      walletLoginId,
      sender.id,
    );
    const hasControlOverReceiver = await this._wallet.hasControlOver(
      walletLoginId,
      receiver.id,
    );
    if (
      (hasControlOverSender && hasControlOverReceiver) ||
      (!isDeduct && hasTrust)
    ) {
      const transfer = await this._transferRepository.create({
        originator_wallet_id: walletLoginId,
        source_wallet_id: sender.id,
        destination_wallet_id: receiver.id,
        state: TransferEnums.STATE.completed,
        parameters: {
          bundle: {
            bundleSize,
          },
        },
        // TODO: boolean for claim
        claim: claimBoolean,
      });
      log.debug('now, deal with tokens');
      const tokens = await this._token.getTokensByBundle(
        sender.id,
        bundleSize,
        claimBoolean,
      );
      // need to check if tokens are not claim
      await this._token.completeTransfer(tokens, transfer, claimBoolean);
      return this.constructor.removeWalletIds(transfer);
    }
    if (hasControlOverSender) {
      log.debug('OK, no permission, source under control, now pending it');
      const transfer = await this.create({
        originator_wallet_id: walletLoginId,
        source_wallet_id: sender.id,
        destination_wallet_id: receiver.id,
        state: TransferEnums.STATE.pending,
        parameters: {
          bundle: {
            bundleSize,
          },
        },
        // TODO: boolean for claim
        claim: claimBoolean,
      });
      // set token transfer_pending to true ??
      return this.constructor.removeWalletIds(transfer);
    }
    if (hasControlOverReceiver) {
      log.debug('OK, no permission, receiver under control, now request it');
      const transfer = await this.create({
        originator_wallet_id: walletLoginId,
        source_wallet_id: sender.id,
        destination_wallet_id: receiver.id,
        state: TransferEnums.STATE.requested,
        parameters: {
          bundle: {
            bundleSize,
          },
        },
        claim: claimBoolean,
      });
      // set token transfer_pending to true ??
      return this.constructor.removeWalletIds(transfer);
    }
    // TODO
    return expect.fail();
  }

  /*
   * Accept a pending transfer, if wallet has the privilege to do so
   */
  async acceptTransfer(transferId, walletLoginId) {
    const transfer = await this._transferRepository.getById(transferId);
    const receiverId = transfer.destination_wallet_id;
    if (transfer.state !== TransferEnums.STATE.pending) {
      throw new HttpError(403, 'The transfer state is not pending');
    }
    const doesCurrentAccountHasControlOverReceiver = await this._wallet.hasControlOver(
      walletLoginId,
      receiverId,
    );
    if (!doesCurrentAccountHasControlOverReceiver) {
      throw new HttpError(
        403,
        'Current account has no permission to accept this transfer',
      );
    }

    transfer.state = TransferEnums.STATE.completed;
    const transferJson = await this.update(transfer);
    const bundleSize = transfer.parameters?.bundle?.bundleSize;

    // deal with tokens
    if (bundleSize) {
      log.debug('transfer bundle of tokens');
      const { source_wallet_id } = transfer;
      const tokens = await this._token.getTokensByBundle(
        source_wallet_id,
        bundleSize,
      );
      if (tokens.length < bundleSize) {
        throw new HttpError(403, 'Do not have enough tokens');
      }
      await this._token.completeTransfer(tokens, transfer);
    } else {
      log.debug('transfer tokens');
      const tokens = await this._token.getTokensByPendingTransferId(transferId);
      Joi.assert(transfer, Joi.object({
        source_wallet_id: Joi.string().required()
      }).unknown());
      await this._token.completeTransfer(tokens, transfer);
    }
    return transferJson;
  }

  /*
   * Decline a pending transfer, if I has the privilege to do so
   */
  async declineTransfer(transferId, walletLoginId) {
    const transfer = await this._transferRepository.getById(transferId);
    const sourceWalletId = transfer.source_wallet_id;
    const destWalletId = transfer.destination_wallet_id;
    if (
      transfer.state !== TransferEnums.STATE.pending &&
      transfer.state !== TransferEnums.STATE.requested
    ) {
      throw new HttpError(
        403,
        'The transfer state is neither pending nor requested',
      );
    }
    if (transfer.state === TransferEnums.STATE.pending) {
      const doesCurrentAccountHasControlOverReceiver = await this._wallet.hasControlOver(
        walletLoginId,
        destWalletId,
      );
      if (!doesCurrentAccountHasControlOverReceiver) {
        throw new HttpError(
          403,
          'Current account has no permission to decline this transfer',
        );
      }
    } else {
      const doesCurrentAccountHasControlOverReceiver = await this._wallet.hasControlOver(
        walletLoginId,
        sourceWalletId,
      );
      if (!doesCurrentAccountHasControlOverReceiver) {
        throw new HttpError(
          403,
          'Current account has no permission to decline this transfer',
        );
      }
    }
    transfer.state = TransferEnums.STATE.cancelled;
    const transferJson = await this.update(transfer);

    // deal with tokens
    const tokens = await this._token.getTokensByPendingTransferId(transfer.id);
    await this._token.cancelTransfer(tokens);
    return transferJson;
  }

  async cancelTransfer(transferId, walletLoginId) {
    const transfer = await this._transferRepository.getById(transferId);
    const sourceWalletId = transfer.source_wallet_id;
    const destWalletId = transfer.destination_wallet_id;
    if (
      transfer.state !== TransferEnums.STATE.pending &&
      transfer.state !== TransferEnums.STATE.requested
    ) {
      throw new HttpError(
        403,
        'The transfer state is neither pending nor requested',
      );
    }
    if (transfer.state === TransferEnums.STATE.pending) {
      const doesCurrentAccountHasControlOverReceiver = await this._wallet.hasControlOver(
        walletLoginId,
        sourceWalletId,
      );
      if (!doesCurrentAccountHasControlOverReceiver) {
        throw new HttpError(
          403,
          'Current account has no permission to cancel this transfer',
        );
      }
    } else {
      const doesCurrentAccountHasControlOverReceiver = await this._wallet.hasControlOver(
        walletLoginId,
        destWalletId,
      );
      if (!doesCurrentAccountHasControlOverReceiver) {
        throw new HttpError(
          403,
          'Current account has no permission to cancel this transfer',
        );
      }
    }
    transfer.state = TransferEnums.STATE.cancelled;
    const transferJson = await this.update(transfer);

    // deal with tokens
    const tokens = await this._token.getTokensByPendingTransferId(transfer.id);
    await this._token.cancelTransfer(tokens);
    return transferJson;
  }

  /*
   * Fulfill a requested transfer, if I has the privilege to do so
   */
  async fulfillTransfer(transferId, walletLoginId) {
    // TODO check privilege

    const transfer = await this._transferRepository.getById(transferId);
    const senderId = transfer.source_wallet_id;
    const doesCurrentAccountHasControlOverReceiver = await this._wallet.hasControlOver(
      walletLoginId,
      senderId,
    );
    if (!doesCurrentAccountHasControlOverReceiver) {
      throw new HttpError(
        403,
        'Current account has no permission to fulfill this transfer',
      );
    }
    if (transfer.state !== TransferEnums.STATE.requested) {
      throw new HttpError(
        403,
        'Operation forbidden, the transfer state is wrong',
      );
    }
    transfer.state = TransferEnums.STATE.completed;
    const transferJson = await this.update(transfer);
    const bundleSize = transfer.parameters?.bundle?.bundleSize;

    // deal with tokens
    if (bundleSize) {
      log.debug('transfer bundle of tokens');
      const tokens = await this._token.getTokensByBundle(senderId, bundleSize);
      await this._token.completeTransfer(tokens, transfer);
    } else {
      log.debug('transfer tokens');
      const tokens = await this._token.getTokensByPendingTransferId(
        transfer.id,
      );
      await this._token.completeTransfer(tokens, transfer);
    }
    return transferJson;
  }

  /*
   * Fulfill a requested transfer, if I have the privilege to do so
   * Specify tokens
   */
  async fulfillTransferWithTokens(transferId, tokens, walletLoginId) {
    // TODO check privilege

    const transfer = await this._transferRepository.getById(transferId);
    const senderId = transfer.source_wallet_id;
    const doesCurrentAccountHasControlOverReceiver = await this._wallet.hasControlOver(
      walletLoginId,
      senderId,
    );
    if (!doesCurrentAccountHasControlOverReceiver) {
      throw new HttpError(
        403,
        'Current account has no permission to fulfill this transfer',
      );
    }
    if (transfer.state !== TransferEnums.STATE.requested) {
      throw new HttpError(
        403,
        'Operation forbidden, the transfer state is wrong',
      );
    }
    transfer.state = TransferEnums.STATE.completed;
    const transferJson = await this.update(transfer);
    const bundleSize = transfer.parameters?.bundle?.bundleSize;

    // deal with tokens
    if (bundleSize) {
      log.debug('transfer bundle of tokens');
      // check it
      if (tokens.length > bundleSize) {
        throw new HttpError(
          403,
          `Too many tokens to transfer, please provider ${bundleSize} tokens for this transfer`,
          true,
        );
      }
      if (tokens.length < bundleSize) {
        throw new HttpError(
          403,
          `Too few tokens to transfer, please provider ${bundleSize} tokens for this transfer`,
          true,
        );
      }
      tokens.forEach((token) => {
        const belongsTo = Token.belongsTo(token, senderId);
        if (!belongsTo) {
          throw new HttpError(
            403,
            `the token:${token.id} does not belong to the sender wallet`,
            true,
          );
        }
      });

      // transfer
      await this._token.completeTransfer(tokens, transfer);
    } else {
      throw new HttpError(403, 'No need to specify tokens', true);
    }
    return transferJson;
  }
}

module.exports = Transfer;
