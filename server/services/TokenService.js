const Token = require('../models/Token');
const WalletService = require('./WalletService');
const Session = require('../infra/database/Session');
const HttpError = require('../utils/HttpError');

class TokenService {
  constructor() {
    this._session = new Session();
    this._token = new Token(this._session);
    this._walletService = new WalletService();
  }

  async getTokens({ wallet, limit, offset, walletLoginId }) {
    let tokens = [];

    if (wallet) {
      const walletInstance = await this._walletService.getByName(wallet);
      const isSub = await this._walletService.hasControlOver(
        walletLoginId,
        walletInstance.id,
      );
      if (!isSub) {
        throw new HttpError(
          403,
          'Wallet does not belong to the logged in wallet',
        );
      }
      tokens = await this._token.getByOwner(walletInstance.id, limit, offset);
    } else {
      tokens = await this._token.getByOwner(walletLoginId, limit, offset);
    }

    return tokens;
  }

  async getById({ id, walletLoginId }, withoutPermissionCheck) {
    // check permission
    const token = await this._token.getById(id);

    if (!withoutPermissionCheck) {
      const { wallets: allWallets } = await this._walletService.getAllWallets(
        walletLoginId,
        undefined,
        undefined,
        false,
        false,
      );

      const walletIds = [...allWallets.map((e) => e.id)];
      if (!walletIds.includes(token.wallet_id)) {
        throw new HttpError(401, 'Have no permission to visit this token');
      }
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

  /*
   * Count how many tokens a wallet has
   */
  async countTokenByWallet(wallet_id) {
    const result = await this._token.countTokenByWallet(wallet_id);
    return result;
  }

  /*
   * Count how many not claimed tokens a wallet has
   */
  async countNotClaimedTokenByWallet(wallet_id) {
    const result = await this._token.countNotClaimedTokenByWallet(wallet_id);
    return result;
  }

  async getTokensByTransferId(transferId, limit, offset) {
    return this._token.getTokensByTransferId(transferId, limit, offset);
  }

  async getTokensByPendingTransferId(transferId, limit, offset) {
    return this._token.getTokensByPendingTransferId(transferId, limit, offset);
  }
}

module.exports = TokenService;
