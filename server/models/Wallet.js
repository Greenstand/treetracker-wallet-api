const log = require('loglevel');
const { validate: uuidValidate } = require('uuid');
const expect = require('expect-runtime'); // TODO: We should use Joi for validation
const Joi = require('joi');
const WalletRepository = require('../repositories/WalletRepository');
const TrustRepository = require('../repositories/TrustRepository');
const Trust = require('./Trust');
const TrustRelationshipEnums = require('../utils/trust-enums');
const TransferRepository = require('../repositories/TransferRepository');
const HttpError = require('../utils/HttpError');
const Transfer = require('./Transfer');
const Token = require('./Token');

class Wallet {
  constructor(session) {
    this._session = session;
    this._trust = new Trust(session);
    this._walletRepository = new WalletRepository(session);
    this._trustRepository = new TrustRepository(session);
    this._transferRepository = new TransferRepository(session);
  }

  async createWallet(loggedInWalletId, wallet) {
    // check name
    try {
      await this._walletRepository.getByName(wallet);
      throw new HttpError(403, `The wallet '${wallet}' has been existed`);
    } catch (e) {
      if (e instanceof HttpError && e.code === 404) {
        // fine
      } else {
        throw e;
      }
    }

    // TO DO: check if wallet is expected format type?
    // TO DO: Need to check account permissions -> manage accounts

    // need to create a wallet object
    const newWallet = await this._walletRepository.create({
      name: wallet,
    });

    await this._trustRepository.create({
      actor_wallet_id: loggedInWalletId,
      originator_wallet_id: loggedInWalletId,
      target_wallet_id: newWallet.id,
      request_type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
      type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
      state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
    });

    return newWallet;
  }

  /*
   * Get all the trust relationships I have requested
   */
  async getTrustRelationshipsRequested() {
    const result = await this.getTrustRelationships();
    return result.filter((trustRelationship) => {
      return trustRelationship.originator_wallet_id === this._id;
    });
  }

  /*
   * Get all the trust relationships targeted to me, means request
   * the trust from me
   */
  async getTrustRelationshipsTargeted() {
    return await this.trustRepository.getByTargetId(this._id);
  }

  async getById(id) {
    return this._walletRepository.getById(id);
  }

  async getByName(name) {
    return this._walletRepository.getByName(name);
  }

  /*
   * Check if a request sent to me is acceptable.
   *
   * Params:
   *  requestType: trust type,
   *  sourceWalletId: the wallet id related to the trust relationship with me,
   */
  async checkTrustRequestSentToMe(requestType, sourceWalletId) {
    // pass
  }

  /*
   * To check if the indicated trust relationship exist between the source and
   * target wallet
   */
  async hasTrust(trustType, senderWallet, receiveWallet) {
    expect(trustType).oneOf(
      Object.keys(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE),
    );
    expect(senderWallet).instanceOf(Wallet);
    expect(receiveWallet).instanceOf(Wallet);
    const trustRelationships = await this.getTrustRelationshipsTrusted();
    // check if the trust exist
    if (
      trustRelationships.some((trustRelationship) => {
        /* Seems unnecessary
        expect(trustRelationship).match({
          actor_wallet_id: expect.any(Number),
          target_wallet_id: expect.any(Number),
          request_type: expect.any(String),
          type: expect.any(String),
        });
        */
        if (
          trustRelationship.actor_wallet_id === senderWallet.getId() &&
          trustRelationship.target_wallet_id === receiveWallet.getId() &&
          trustRelationship.request_type ===
            TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send
        ) {
          return true;
        }
        return false;
      }) ||
      trustRelationships.some((trustRelationship) => {
        /* Seems unnecessary
        expect(trustRelationship).match({
          actor_wallet_id: expect.any(Number),
          target_wallet_id: expect.any(Number),
          request_type: expect.any(String),
          type: expect.any(String),
        });
        */
        if (
          trustRelationship.actor_wallet_id === receiveWallet.getId() &&
          trustRelationship.target_wallet_id === senderWallet.getId() &&
          trustRelationship.request_type ===
            TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive
        ) {
          return true;
        }
        return false;
      })
    ) {
      log.debug('check trust passed');
      return true;
    }
    return false;
  }

  /*
   * Transfer some tokens from the sender to receiver
   */
  async transfer(sender, receiver, tokens, claimBoolean) {
    //    await this.checkDeduct(sender, receiver);
    // check tokens belong to sender
    for (const token of tokens) {
      if (!(await token.belongsTo(sender))) {
        const uuid = await token.getId();
        throw new HttpError(
          403,
          `The token ${uuid} do not belongs to sender wallet`,
        );
      }
      if (!(await token.beAbleToTransfer())) {
        const uuid = await token.getId();
        throw new HttpError(
          403,
          `The token ${uuid} can not be transfer for some reason, for example, it's been pending for another transfer`,
        );
      }
    }
    const isDeduct = await this.isDeduct(sender, receiver);
    const hasTrust = await this.hasTrust(
      TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
      sender,
      receiver,
    );
    const hasControlOverSender = await this.hasControlOver(sender);
    const hasControlOverReceiver = await this.hasControlOver(receiver);
    // If has the trust, and is not deduct request (now, if wallet request some token from another wallet, can not pass the transfer directly)
    if (
      (hasControlOverSender && hasControlOverReceiver) ||
      (!isDeduct && hasTrust)
    ) {
      const tokensId = [];
      for (const token of tokens) {
        // check if the tokens you want to transfer is claimed, i.e. not transferrable
        if (token._JSON.claim === true) {
          console.log('token is claimed, cannot be transfered');
          const uuid = token._id;
          throw new HttpError(
            403,
            `The token ${uuid} is claimed, cannot be transfered`,
          );
        }
        tokensId.push(token.getId());
      }
      const transfer = await this.transferRepository.create({
        originator_wallet_id: this._id,
        source_wallet_id: sender.getId(),
        destination_wallet_id: receiver.getId(),
        state: Transfer.STATE.completed,
        parameters: {
          tokens: tokensId,
        },
        // TODO: add boolean for claim in transferRepository
        claim: claimBoolean,
      });
      log.debug('now, deal with tokens');
      await this.tokenService.completeTransfer(tokens, transfer, claimBoolean);
      return transfer;

      // TODO: Do I need claim boolean in below cases?
    }
    // else{

    // }

    if (hasControlOverSender) {
      log.debug('OK, no permission, source under control, now pending it');
      const tokensId = [];
      for (const token of tokens) {
        tokensId.push(token.getId());
      }
      const transfer = await this.transferRepository.create({
        originator_wallet_id: this._id,
        source_wallet_id: sender.getId(),
        destination_wallet_id: receiver.getId(),
        state: Transfer.STATE.pending,
        parameters: {
          tokens: tokensId,
        },
        claim: claimBoolean,
      });
      await this.tokenService.pendingTransfer(tokens, transfer);
      // check if the tokens you want to transfer is claimed, i.e. not trasfferable
      for (const token of tokens) {
        if (token._JSON.claim === true) {
          console.log('token is claimed, cannot be transfered');
          const uuid = token._id;
          throw new HttpError(
            403,
            `The token ${uuid} is claimed, cannot be transfered`,
          );
        }
      }
      return transfer;
    }
    if (hasControlOverReceiver) {
      log.debug('OK, no permission, receiver under control, now request it');
      const tokensId = [];
      for (const token of tokens) {
        tokensId.push(token.getId());
      }
      const transfer = await this.transferRepository.create({
        originator_wallet_id: this._id,
        source_wallet_id: sender.getId(),
        destination_wallet_id: receiver.getId(),
        state: Transfer.STATE.requested,
        parameters: {
          tokens: tokensId,
        },
        claim: claimBoolean,
      });
      await this.tokenService.pendingTransfer(tokens, transfer);
      // check if the tokens you want to transfer is claimed, i.e. not trasfferable
      for (const token of tokens) {
        if (token._JSON.claim === true) {
          console.log('token is claimed, cannot be transfered');
          const uuid = token._id;
          throw new HttpError(
            403,
            `The token ${uuid} is claimed, cannot be transfered`,
          );
        }
      }
      return transfer;
    }
    // TODO
    expect.fail();
  }

  async transferBundle(sender, receiver, bundleSize, claimBoolean) {
    // check has enough tokens to sender
    const tokenCount = await this.tokenService.countTokenByWallet(sender);
    // count number of tokens not claimed
    const notClaimedTokenCount = await this.tokenService.countNotClaimedTokenByWallet(
      sender,
    );
    // if(tokenCount < bundleSize){
    // throw new HttpError(403, `Do not have enough tokens to send`);
    // }
    // console.log(notClaimedTokenCount);
    if (notClaimedTokenCount < bundleSize) {
      throw new HttpError(403, `Do not have enough tokens to send`);
    }

    const isDeduct = await this.isDeduct(sender, receiver);
    // If has the trust, and is not deduct request (now, if wallet request some token from another wallet, can not pass the transfer directly)
    const hasTrust = await this.hasTrust(
      TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
      sender,
      receiver,
    );
    const hasControlOverSender = await this.hasControlOver(sender);
    const hasControlOverReceiver = await this.hasControlOver(receiver);
    if (
      (hasControlOverSender && hasControlOverReceiver) ||
      (!isDeduct && hasTrust)
    ) {
      const transfer = await this.transferRepository.create({
        originator_wallet_id: this._id,
        source_wallet_id: sender.getId(),
        destination_wallet_id: receiver.getId(),
        state: Transfer.STATE.completed,
        parameters: {
          bundle: {
            bundleSize,
          },
        },
        // TODO: boolean for claim
        claim: claimBoolean,
      });
      log.debug('now, deal with tokens');
      const tokens = await this.tokenService.getTokensByBundle(
        sender,
        bundleSize,
        claimBoolean,
      );
      // need to check if tokens are not claim
      await this.tokenService.completeTransfer(tokens, transfer, claimBoolean);
      return transfer;
    }
    if (hasControlOverSender) {
      log.debug('OK, no permission, source under control, now pending it');
      const transfer = await this.transferRepository.create({
        originator_wallet_id: this._id,
        source_wallet_id: sender.getId(),
        destination_wallet_id: receiver.getId(),
        state: Transfer.STATE.pending,
        parameters: {
          bundle: {
            bundleSize,
          },
        },
        // TODO: boolean for claim
        claim: claimBoolean,
      });
      return transfer;
    }
    if (hasControlOverReceiver) {
      log.debug('OK, no permission, receiver under control, now request it');
      const transfer = await this.transferRepository.create({
        originator_wallet_id: this._id,
        source_wallet_id: sender.getId(),
        destination_wallet_id: receiver.getId(),
        state: Transfer.STATE.requested,
        parameters: {
          bundle: {
            bundleSize,
          },
        },
        claim: claimBoolean,
      });
      return transfer;
    }
    // TODO
    expect.fail();
  }

  /*
   * I have control over given wallet
   */
  async hasControlOver(parentId, childId) {
    // if the given wallet is me, then pass
    if (parentId === childId) {
      log.debug('The same wallet, control');
      return true;
    }
    // check sub wallet
    const result = await this.getSubWallets(parentId, childId);

    if (result.length > 0) {
      return true;
    }
    return false;
  }

  /*
   * To get all the pending transfer sent to me
   */
  async getPendingTransfers() {
    const result = await this.transferRepository.getPendingTransfers(this._id);
    return result;
  }

  /*
   * Accept a pending transfer, if wallet has the privilege to do so
   */
  async acceptTransfer(transferId) {
    const transfer = await this.transferRepository.getById(transferId);
    const receiver = await this.walletService.getById(
      transfer.destination_wallet_id,
    );
    if (transfer.state !== Transfer.STATE.pending) {
      throw new HttpError(403, 'The transfer state is not pending');
    }
    const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(
      receiver,
    );
    if (!doseCurrentAccountHasControlOverReceiver) {
      throw new HttpError(
        403,
        'Current account has no permission to accept this transfer',
      );
    }

    transfer.state = Transfer.STATE.completed;
    const transferJson = await this.transferRepository.update(transfer);

    // deal with tokens
    if (
      // TODO optimize
      transfer.parameters &&
      transfer.parameters.bundle &&
      transfer.parameters.bundle.bundleSize
    ) {
      log.debug('transfer bundle of tokens');
      const { source_wallet_id } = transfer;
      const senderWallet = new Wallet(source_wallet_id, this._session);
      const tokens = await this.tokenService.getTokensByBundle(
        senderWallet,
        transfer.parameters.bundle.bundleSize,
      );
      if (tokens.length < transfer.parameters.bundle.bundleSize) {
        throw new HttpError(403, 'Do not have enough tokens');
      }
      await this.tokenService.completeTransfer(tokens, transfer);
    } else {
      log.debug('transfer tokens');
      const tokens = await this.tokenService.getTokensByPendingTransferId(
        transferId,
      );
      expect(transfer).match({
        source_wallet_id: expect.any(String),
      });
      await this.tokenService.completeTransfer(tokens, transfer);
    }
    return transferJson;
  }

  /*
   * Decline a pending transfer, if I has the privilege to do so
   */
  async declineTransfer(transferId) {
    const transfer = await this.transferRepository.getById(transferId);
    const sourceWallet = await this.walletService.getById(
      transfer.source_wallet_id,
    );
    const destWallet = await this.walletService.getById(
      transfer.destination_wallet_id,
    );
    if (
      transfer.state !== Transfer.STATE.pending &&
      transfer.state !== Transfer.STATE.requested
    ) {
      throw new HttpError(
        403,
        'The transfer state is not pending and requested',
      );
    }
    if (transfer.state === Transfer.STATE.pending) {
      const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(
        destWallet,
      );
      if (!doseCurrentAccountHasControlOverReceiver) {
        throw new HttpError(
          403,
          'Current account has no permission to decline this transfer',
        );
      }
    } else {
      const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(
        sourceWallet,
      );
      if (!doseCurrentAccountHasControlOverReceiver) {
        throw new HttpError(
          403,
          'Current account has no permission to decline this transfer',
        );
      }
    }
    transfer.state = Transfer.STATE.cancelled;
    const transferJson = await this.transferRepository.update(transfer);

    // deal with tokens
    const tokens = await this.tokenService.getTokensByPendingTransferId(
      transfer.id,
    );
    await this.tokenService.cancelTransfer(tokens, transfer);
    return transferJson;
  }

  async cancelTransfer(transferId) {
    const transfer = await this.transferRepository.getById(transferId);
    const sourceWallet = await this.walletService.getById(
      transfer.source_wallet_id,
    );
    const destWallet = await this.walletService.getById(
      transfer.destination_wallet_id,
    );
    if (
      transfer.state !== Transfer.STATE.pending &&
      transfer.state !== Transfer.STATE.requested
    ) {
      throw new HttpError(
        403,
        'The transfer state is not pending and requested',
      );
    }
    if (transfer.state === Transfer.STATE.pending) {
      const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(
        sourceWallet,
      );
      if (!doseCurrentAccountHasControlOverReceiver) {
        throw new HttpError(
          403,
          'Current account has no permission to cancel this transfer',
        );
      }
    } else {
      const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(
        destWallet,
      );
      if (!doseCurrentAccountHasControlOverReceiver) {
        throw new HttpError(
          403,
          'Current account has no permission to cancel this transfer',
        );
      }
    }
    transfer.state = Transfer.STATE.cancelled;
    const transferJson = await this.transferRepository.update(transfer);

    // deal with tokens
    const tokens = await this.tokenService.getTokensByPendingTransferId(
      transfer.id,
    );
    await this.tokenService.cancelTransfer(tokens, transfer);
    return transferJson;
  }

  /*
   * Fulfill a requested transfer, if I has the privilege to do so
   */
  async fulfillTransfer(transferId) {
    // TODO check privilege

    const transfer = await this.transferRepository.getById(transferId);
    const sender = await this.walletService.getById(transfer.source_wallet_id);
    const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(
      sender,
    );
    if (!doseCurrentAccountHasControlOverReceiver) {
      throw new HttpError(
        403,
        'Current account has no permission to fulfill this transfer',
      );
    }
    if (transfer.state !== Transfer.STATE.requested) {
      throw new HttpError(
        403,
        'Operation forbidden, the transfer state is wrong',
      );
    }
    transfer.state = Transfer.STATE.completed;
    const transferJson = await this.transferRepository.update(transfer);

    // deal with tokens
    if (
      // TODO optimize
      transfer.parameters &&
      transfer.parameters.bundle &&
      transfer.parameters.bundle.bundleSize
    ) {
      log.debug('transfer bundle of tokens');
      const { source_wallet_id } = transfer;
      const senderWallet = new Wallet(source_wallet_id, this._session);
      const tokens = await this.tokenService.getTokensByBundle(
        senderWallet,
        transfer.parameters.bundle.bundleSize,
      );
      await this.tokenService.completeTransfer(tokens, transfer);
    } else {
      log.debug('transfer tokens');
      const tokens = await this.tokenService.getTokensByPendingTransferId(
        transfer.id,
      );
      await this.tokenService.completeTransfer(tokens, transfer);
    }
    return transferJson;
  }

  /*
   * Fulfill a requested transfer, if I has the privilege to do so
   * Specify tokens
   */
  async fulfillTransferWithTokens(transferId, tokens) {
    // TODO check privilege

    const transfer = await this.transferRepository.getById(transferId);
    const sender = await this.walletService.getById(transfer.source_wallet_id);
    const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(
      sender,
    );
    if (!doseCurrentAccountHasControlOverReceiver) {
      throw new HttpError(
        403,
        'Current account has no permission to fulfill this transfer',
      );
    }
    if (transfer.state !== Transfer.STATE.requested) {
      throw new HttpError(
        403,
        'Operation forbidden, the transfer state is wrong',
      );
    }
    transfer.state = Transfer.STATE.completed;
    const transferJson = await this.transferRepository.update(transfer);

    // deal with tokens
    if (
      // TODO optimize
      transfer.parameters &&
      transfer.parameters.bundle &&
      transfer.parameters.bundle.bundleSize
    ) {
      log.debug('transfer bundle of tokens');
      const { source_wallet_id } = transfer;
      const senderWallet = new Wallet(source_wallet_id, this._session);
      // check it
      if (tokens.length > transfer.parameters.bundle.bundleSize) {
        throw new HttpError(
          403,
          `Too many tokens to transfer, please provider ${transfer.parameters.bundle.bundleSize} tokens for this transfer`,
          true,
        );
      }
      if (tokens.length < transfer.parameters.bundle.bundleSize) {
        throw new HttpError(
          403,
          `Too few tokens to transfer, please provider ${transfer.parameters.bundle.bundleSize} tokens for this transfer`,
          true,
        );
      }
      for (const token of tokens) {
        const belongsTo = await token.belongsTo(senderWallet);
        if (!belongsTo) {
          const json = await token.toJSON();
          throw new HttpError(
            403,
            `the token:${json.uuid} do not belongs to sender walleter`,
            true,
          );
        }
      }

      // transfer
      await this.tokenService.completeTransfer(tokens, transfer);
    } else {
      throw new HttpError(403, 'No need to specify tokens', true);
    }
    return transferJson;
  }

  /*
   * Get all transfers belongs to me
   */
  async getTransfers(state, wallet, offset = 0, limit) {
    const filter = {
      and: [],
    };
    filter.and.push({
      or: [
        {
          source_wallet_id: this._id,
        },
        {
          destination_wallet_id: this._id,
        },
        {
          originator_wallet_id: this._id,
        },
      ],
    });
    if (state) {
      filter.and.push({ state });
    }
    if (wallet) {
      filter.and.push({
        or: [
          {
            source_wallet_id: wallet.getId(),
          },
          {
            destination_wallet_id: wallet.getId(),
          },
          {
            originator_wallet_id: wallet.getId(),
          },
        ],
      });
    }
    return await this.transferRepository.getByFilter(filter, { offset, limit });
  }

  async getTransferById(id) {
    const transfers = await this.getTransfers();
    const transfer = transfers.reduce((a, c) => {
      if (c.id === id) {
        return c;
      }
      return a;
    }, undefined);
    if (!transfer) {
      throw new HttpError(
        404,
        'Can not find this transfer or it is related to this wallet',
      );
    }
    return transfer;
  }

  async getTokensByTransferId(id, limit, offset) {
    const transfer = await this.getTransferById(id);
    let tokens;
    if (transfer.state === Transfer.STATE.completed) {
      tokens = await this.tokenService.getTokensByTransferId(
        transfer.id,
        limit,
        offset,
      );
    } else {
      tokens = await this.tokenService.getTokensByPendingTransferId(
        transfer.id,
        limit,
        offset,
      );
    }
    return tokens;
  }

  /*
   * Check if it is deduct, if ture, throw 403, cuz we do not support it yet
   */
  async isDeduct(sender, receiver) {
    if (this._id === sender.getId()) {
      return false;
    }
    const result = await this.hasControlOver(sender);
    if (result) {
      return false;
    }
    return true;
  }

  /*
   * Get all wallet managed by me(parentId)
   * Optionally get a specific subwallet
   */
  async getSubWallets(parentId, childId) {
    const filter = {
      or: [
        {
          and: [
            {
              actor_wallet_id: parentId,
            },
            {
              request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.manage,
            },

            {
              state: TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
            },
          ],
        },
        {
          and: [
            {
              request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.yield,
            },
            {
              target_wallet_id: parentId,
            },
            {
              state: TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
            },
          ],
        },
      ],
    };

    if (childId) {
      filter.or[0].and.push({
        target_wallet_id: childId,
      });
      filter.or[1].and.push({
        actor_wallet_id: childId,
      });
    }
    const result = await this._trustRepository.getByFilter(filter);

    return result;
  }

  // get wallet itself along with all subwallets
  async getAllWallets(id, limitOptions) {
    return this._walletRepository.getAllWallets(id, limitOptions);
  }
}

module.exports = Wallet;
