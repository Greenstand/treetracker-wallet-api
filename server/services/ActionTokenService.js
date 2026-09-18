/**
 * Action tokens for "send token by email": a stateless, signed, expiring
 * token authorizing a future transfer
*/
const jwt = require('jsonwebtoken');
const HttpError = require('../utils/HttpError');
const TokenService = require('./TokenService');
const TransferService = require('./TransferService');
const WalletService = require('./WalletService');

const ACTION_TOKEN_TYPE = 'send-token';
const ACTION_TOKEN_TTL = process.env.ACTION_TOKEN_TTL || '7d';
const ACTION_TOKEN_SECRET =
  process.env.ACTION_TOKEN_SECRET || 'action-token-dev-secret';

class ActionTokenService {
  constructor() {
    this._tokenService = new TokenService();
    this._transferService = new TransferService();
    this._walletService = new WalletService();
  }

  /** 
   * options can override signing options 
  */
  static signActionToken(payload, options = {}) {
    return jwt.sign(
      { ...payload, action: ACTION_TOKEN_TYPE },
      ACTION_TOKEN_SECRET,
      {
        issuer: 'greenstand',
        algorithm: 'HS256',
        expiresIn: ACTION_TOKEN_TTL,
        ...options,
      },
    );
  }

  // Verify signature, issuer, expiry, and action type; any failure is a 401
  static verifyActionToken(token) {
    if (!token) {
      throw new HttpError(401, 'ERROR: ActionToken, no token supplied');
    }
    let decoded;
    try {
      decoded = jwt.verify(token, ACTION_TOKEN_SECRET, {
        issuer: 'greenstand',
        algorithms: ['HS256'],
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new HttpError(401, 'ERROR: ActionToken expired');
      }
      throw new HttpError(401, 'ERROR: ActionToken not verified');
    }
    if (decoded.action !== ACTION_TOKEN_TYPE) {
      throw new HttpError(401, 'ERROR: ActionToken, invalid action type');
    }
    return decoded;
  }

  async generate(
    { recipient_email, tokens, bundle, sender_wallet },
    walletLoginId,
  ) {
    let tokenIds;

    // Absent sender_wallet keeps the previous behaviour: the login wallet.
    let senderWalletId = walletLoginId;
    if (sender_wallet) {
      const wallet = await this._walletService.getByIdOrName(sender_wallet);
      const isSub = await this._walletService.hasControlOver(
        walletLoginId,
        wallet.id,
      );
      if (!isSub) {
        throw new HttpError(
          403,
          'Wallet does not belong to the logged in wallet',
        );
      }
      senderWalletId = wallet.id;
    }

    if (tokens) {
      const resolved = await Promise.all(
        tokens.map((id) => this._tokenService.getById({ id, walletLoginId })),
      );
      tokenIds = resolved.map((token) => token.id);
    } else {
      const resolved = await this._tokenService.getTokens({
        wallet: sender_wallet,
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

    const actionToken = ActionTokenService.signActionToken({
      sub: recipient_email,
      sender_wallet_id: senderWalletId,
      token_ids: tokenIds,
    });

    const { exp } = ActionTokenService.verifyActionToken(actionToken);
    return {
      action_token: actionToken,
      expires_at: new Date(exp * 1000).toISOString(),
      token_count: tokenIds.length,
    };
  }

  async redeem({ action_token, wallet }, walletLoginId) {
    const payload = ActionTokenService.verifyActionToken(action_token);

    // Default to the caller's login wallet, but let them redeem into any
    // wallet they control (e.g. one they just created) instead (#855).
    let receiverWalletId = walletLoginId;
    if (wallet) {
      const walletInstance = await this._walletService.getByIdOrName(wallet);
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
      receiverWalletId = walletInstance.id;
    }

    return this._transferService.redeemActionToken({
      senderWalletId: payload.sender_wallet_id,
      receiverWalletId,
      tokenIds: payload.token_ids,
    });
  }
}

module.exports = ActionTokenService;
