/**
 * Action tokens for "send token by email": a stateless, signed,
 * expiring token encoding an intention to transfer tokens to a future account
*/
const JWTService = require('./JWTService');
const HttpError = require('../utils/HttpError');
const TokenService = require('./TokenService');
const TransferService = require('./TransferService');

class ActionTokenService {
  constructor() {
    this._tokenService = new TokenService();
    this._transferService = new TransferService();
  }

  async generate({ recipient_email, tokens, bundle }, walletLoginId) {
    let tokenIds;

    if (tokens) {
      const resolved = await Promise.all(
        tokens.map((id) => this._tokenService.getById({ id, walletLoginId })),
      );
      tokenIds = resolved.map((token) => token.id);
    } else {
      const resolved = await this._tokenService.getTokens({
        limit: bundle.bundle_size,
        offset: 0,
        walletLoginId,
      });
      if (resolved.length < bundle.bundle_size) {
        throw new HttpError(
          409,
          `Wallet does not have ${bundle.bundle_size} tokens available`,
        );
      }
      tokenIds = resolved.map((token) => token.id);
    }

    const actionToken = JWTService.signActionToken({
      sub: recipient_email,
      sender_wallet_id: walletLoginId,
      token_ids: tokenIds,
    });

    const { exp } = JWTService.verifyActionToken(actionToken);
    return {
      action_token: actionToken,
      expires_at: new Date(exp * 1000).toISOString(),
      token_count: tokenIds.length,
    };
  }

  async redeem({ action_token }, walletLoginId) {
    const payload = JWTService.verifyActionToken(action_token);
    return this._transferService.redeemActionToken({
      senderWalletId: payload.sender_wallet_id,
      receiverWalletId: walletLoginId,
      tokenIds: payload.token_ids,
    });
  }
}

module.exports = ActionTokenService;
