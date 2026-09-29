/**
 * Action tokens for "send token by email": a stateless, signed, expiring
 * token authorizing a future transfer
*/
const jwt = require('jsonwebtoken');
const HttpError = require('../utils/HttpError');
const Session = require('../infra/database/Session');
const Token = require('../models/Token');
const TokenService = require('./TokenService');
const TransferService = require('./TransferService');
const WalletService = require('./WalletService');

const ACTION_TOKEN_TYPE = 'send-token';
const ACTION_TOKEN_TTL = process.env.ACTION_TOKEN_TTL || '7d';
// A share link is a bearer credential for the tokens it names, so the secret
// that signs it must come from the environment: a fallback readable on GitHub
// would let anyone forge a link for any wallet (#573). Refuse to start
// without it. Only the test suite may use a fixed value; it never leaves the
// process.
function resolveActionTokenSecret() {
  if (process.env.ACTION_TOKEN_SECRET) {
    return process.env.ACTION_TOKEN_SECRET;
  }
  if (process.env.NODE_ENV === 'test') {
    return 'action-token-test-secret';
  }
  throw new Error(
    'ACTION_TOKEN_SECRET is not set: refusing to start, share links would be signed with a public fallback secret (#573)',
  );
}
const ACTION_TOKEN_SECRET = resolveActionTokenSecret();

class ActionTokenService {
  constructor() {
    this._session = new Session();
    this._token = new Token(this._session);
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
    keycloakId,
  ) {
    let tokenIds;
    let tokenCount;

    let senderWalletId = walletLoginId;
    if (sender_wallet) {
      const wallet = await this._walletService.getByName(sender_wallet);
      const isOwn = await this._walletService.canActFor(wallet, {
        keycloakId,
        walletLoginId,
      });
      if (!isOwn) {
        throw new HttpError(403, 'Wallet does not belong to this account');
      }
      senderWalletId = wallet.id;
    }

    if (tokens) {
      const resolved = await Promise.all(
        tokens.map((id) => this._tokenService.getById({ id, walletLoginId })),
      );
      const foreign = resolved.filter(
        (token) => token.wallet_id !== senderWalletId,
      );
      if (foreign.length > 0) {
        throw new HttpError(
          409,
          `Token(s) do not belong to the sender wallet: ${foreign
            .map((token) => token.id)
            .join(', ')}`,
        );
      }
      tokenIds = resolved.map((token) => token.id);
    } else {
      const available = await this._token.getTransferableByOwner(
        senderWalletId,
        bundle.bundle_size,
      );
      if (available.length < bundle.bundle_size) {
        throw new HttpError(
          409,
          `Wallet does not have ${bundle.bundle_size} tokens available`,
        );
      }
      tokenCount = bundle.bundle_size;
    }

    const actionToken = ActionTokenService.signActionToken({
      sub: recipient_email,
      sender_wallet_id: senderWalletId,
      ...(tokenIds ? { token_ids: tokenIds } : { token_count: tokenCount }),
    });

    const { exp } = ActionTokenService.verifyActionToken(actionToken);
    return {
      action_token: actionToken,
      expires_at: new Date(exp * 1000).toISOString(),
      token_count: tokenIds ? tokenIds.length : tokenCount,
    };
  }

  async redeem({ action_token }, walletLoginId) {
    const payload = ActionTokenService.verifyActionToken(action_token);
    return this._transferService.redeemActionToken({
      senderWalletId: payload.sender_wallet_id,
      receiverWalletId: walletLoginId,
      tokenIds: payload.token_ids,
      tokenCount: payload.token_count,
    });
  }
}

module.exports = ActionTokenService;
