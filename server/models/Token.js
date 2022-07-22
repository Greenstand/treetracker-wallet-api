const log = require('loglevel');
const Joi = require('joi');
const TokenRepository = require('../repositories/TokenRepository');
const TransactionRepository = require('../repositories/TransactionRepository');

class Token {
  constructor(session) {
    this._tokenRepository = new TokenRepository(session);
    this._transactionRepository = new TransactionRepository(session);
  }

  /*
   * Count how many tokens a wallet has
   */
  async countTokenByWallet(wallet_id) {
    const result = await this._tokenRepository.countByFilter({
      wallet_id,
    });
    return result;
  }

  /*
   * Count how many not claimed tokens a wallet has
   */
  async countNotClaimedTokenByWallet(wallet_id) {
    const result = await this._tokenRepository.countByFilter({
      wallet_id,
      claim: false,
    });
    return result;
  }

  /*
   * Get n tokens from a wallet
   */
  async getTokensByBundle(wallet_id, bundleSize, claimBoolean) {
    // TODO: getByFilter should be able to handle claim boolean
    const result = await this._tokenRepository.getByFilter(
      {
        wallet_id,
        transfer_pending: false,
      },
      {
        limit: bundleSize,
        // add claim
        claim: claimBoolean, // doesn't do anything, is the claim to be filtered out?
      },
    );
    return result;
  }

  /*
   * Replaced token.completeTransfer, as a bulk operaction
   */
  async completeTransfer(tokens, transfer, claimBoolean) {
    log.debug('Token complete transfer batch');
    await this._tokenRepository.updateByIds(
      {
        transfer_pending: false,
        transfer_pending_id: null,
        wallet_id: transfer.destination_wallet_id,
        claim: claimBoolean,
      },
      tokens.map((token) => token.id),
    );
    await this._transactionRepository.batchCreate(
      tokens.map((token) => ({
        token_id: token.id,
        transfer_id: transfer.id,
        source_wallet_id: transfer.source_wallet_id,
        destination_wallet_id: transfer.destination_wallet_id,
        claim: claimBoolean,
      })),
    );
  }

  /*
   * Batch operaction to pending transfer
   */
  async pendingTransfer(tokens, transfer) {
    Joi.assert(transfer.id, Joi.string().guid());

    await this._tokenRepository.updateByIds(
      {
        transfer_pending: true,
        transfer_pending_id: transfer.id,
      },
      tokens.map((token) => token.id),
    );
  }

  /*
   * Batch way to cancel transfer
   */
  async cancelTransfer(tokens) {
    log.debug('Token cancel transfer');
    await this._tokenRepository.updateByIds(
      {
        transfer_pending: false,
        transfer_pending_id: null,
      },
      tokens.map((token) => token.id),
    );
  }

  static belongsTo(token, walletId) {
    if (token.wallet_id === walletId) {
      return true;
    }
    return false;
  }

  static beAbleToTransfer(token) {
    if (token.transfer_pending === false) {
      return true;
    }
    return false;
  }

  async getTransactions({ limit, offset = 0, tokenId }) {
    const transactions = await this._transactionRepository.getByFilter(
      { token_id: tokenId },
      { limit, offset },
    );
    return transactions;
  }

  async getByOwner(walletId, limit, offset) {
    const tokensObject = await this._tokenRepository.getByFilter(
      { wallet_id: walletId },
      { limit, offset },
    );
    return tokensObject;
  }

  async getById(id) {
    const tokenObject = await this._tokenRepository.getById(id);
    tokenObject.links = {
      capture: `/webmap/tree?uuid=${tokenObject.capture_id}`,
    };
    return tokenObject;
  }

  async getTokensByPendingTransferId(transferId, limit, offset = 0) {
    const result = await this._tokenRepository.getByFilter(
      { transfer_pending_id: transferId },
      { limit, offset },
    );
    return result;
  }

  async getTokensByTransferId(transferId, limit, offset = 0) {
    const result = await this._tokenRepository.getByTransferId(
      transferId,
      limit,
      offset,
    );
    return result;
  }
}

module.exports = Token;
