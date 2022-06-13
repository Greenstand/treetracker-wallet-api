const log = require('loglevel');
const Joi = require('joi');
const Token = require('../models/Token');
const TokenRepository = require('../repositories/TokenRepository');
const TransactionRepository = require('../repositories/TransactionRepository');
const WalletService = require('./WalletService');
const Session = require('../database/Session');

class TokenService {
  constructor(session) {
    this._session = new Session();
    this._token = new Token(this._session);
    this.tokenRepository = new TokenRepository(session);
    this.transactionRepository = new TransactionRepository(session);
    this._walletService = new WalletService();
  }

  async getTokens({ wallet, limit, offset, walletLoginId }) {
    const walletLogin = await this._walletService.getById(walletLoginId);
    let tokens = [];

    if (wallet) {
      const walletInstance = await this._walletService.getByName(wallet);
      const isSub = await this._walletService.hasControlOver(
        walletLoginId,
        wwalletInstance.id,
      );
      if (!isSub) {
        throw new HttpError(403, 'Wallet does not belong to wallet logged in');
      }
      tokens = await this._token.getByOwner(walletInstance, limit, offset);
    } else {
      tokens = await this._token.getByOwner(walletLogin, limit, offset);
    }

    return tokens;
  }

  async getById({ id, walletLoginId }) {
    // check permission
    const token = this._token.getById(id);
    const allWallets = await this._walletService.getAllWallets(walletLoginId);

    const walletIds = [...allWallets.map((e) => e.id)];
    if (!walletIds.includes(token.wallet_id)) {
      throw new HttpError(401, 'Have no permission to visit this token');
    }
    return token;
  }

  async getTransactions({ tokenId, limit, offset, walletLoginId }) {
    // verify permission
    await this.getById({ id: tokenId, walletLoginId });
    const transactions = await this._token.getTransactions({
      limit,
      offset,
      tokenId,
    });

    return transactions;
  }

  // =================================================================================================

  async getTokensByPendingTransferId(transferId, limit, offset = 0) {
    const result = await this.tokenRepository.getByFilter(
      {
        transfer_pending_id: transferId,
      },
      { limit, offset },
    );
    return result.map((object) => {
      return new Token(object, this._session);
    });
  }

  /*
   * Get n tokens from a wallet
   */
  async getTokensByBundle(wallet, bundleSize, claimBoolean) {
    console.log(claimBoolean);
    // TODO: getByFilter should be able to handle claim boolean
    const result = await this.tokenRepository.getByFilter(
      {
        wallet_id: wallet.getId(),
        transfer_pending: false,
      },
      {
        limit: bundleSize,
        // add claim
        claim: claimBoolean,
      },
    );
    return result.map((json) => new Token(json, this._session));
  }

  /*
   * Count how many tokens a wallet has
   */
  async countTokenByWallet(wallet_id) {
    const result = await this.tokenRepository.countByFilter({
      wallet_id,
    });
    return result;
  }

  /*
   * Count how many not claimed tokens a wallet has
   */
  async countNotClaimedTokenByWallet(wallet) {
    const result = await this.tokenRepository.countByFilter({
      wallet_id: wallet.getId(),
      claim: false,
    });
    return result;
  }

  async getTokensByTransferId(transferId, limit, offset = 0) {
    const result = await this.tokenRepository.getByTransferId(
      transferId,
      limit,
      offset,
    );
    const tokens = [];
    for (const r of result) {
      const token = new Token(r);
      tokens.push(token);
    }
    return tokens;
  }

  /*
   * To replace token.completeTransfer, as a bulk operaction
   */
  async completeTransfer(tokens, transfer, claimBoolean) {
    log.debug('Token complete transfer batch');
    await this.tokenRepository.updateByIds(
      {
        transfer_pending: false,
        transfer_pending_id: null,
        wallet_id: transfer.destination_wallet_id,
        claim: claimBoolean,
      },
      tokens.map((token) => token.getId()),
    );
    await this.transactionRepository.batchCreate(
      tokens.map((token) => ({
        token_id: token.getId(),
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

    await this.tokenRepository.updateByIds(
      {
        transfer_pending: true,
        transfer_pending_id: transfer.id,
      },
      tokens.map((token) => token.getId()),
    );
  }

  /*
   * Batch way to cancel transfer
   */
  async cancelTransfer(tokens, transfer) {
    log.debug('Token cancel transfer');
    await this.tokenRepository.updateByIds(
      {
        transfer_pending: false,
        transfer_pending_id: null,
      },
      tokens.map((token) => token.getId()),
    );
  }
}

module.exports = TokenService;
