/**
 * Action tokens for "send token by email"/share link: a signed, expiring token
 * authorizing a future transfer. The token itself stays stateless; a persisted
 * action_token row mirrors each issued link so the sender can list and revoke
 * outstanding links and redemption can reject cancelled/spent links (#846).
 */
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const HttpError = require('../utils/HttpError');
const TokenService = require('./TokenService');
const TransferService = require('./TransferService');
const WalletService = require('./WalletService');
const Session = require('../infra/database/Session');
const ActionTokenRepository = require('../repositories/ActionTokenRepository');

const ACTION_TOKEN_TYPE = 'send-token';
const ACTION_TOKEN_TTL = process.env.ACTION_TOKEN_TTL || '7d';
const ACTION_TOKEN_SECRET =
  process.env.ACTION_TOKEN_SECRET || 'action-token-dev-secret';

const STATE = {
  active: 'active',
  redeemed: 'redeemed',
  cancelled: 'cancelled',
  expired: 'expired',
};

class ActionTokenService {
  constructor() {
    this._session = new Session();
    this._tokenService = new TokenService();
    this._transferService = new TransferService();
    this._walletService = new WalletService();
    this._actionTokenRepository = new ActionTokenRepository(this._session);
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

  // Derive the state shown to the sender: an active link past its expiry reads
  // as expired without a background job flipping the stored state.
  static deriveState(record) {
    if (
      record.state === STATE.active &&
      new Date(record.expires_at).getTime() < Date.now()
    ) {
      return STATE.expired;
    }
    return record.state;
  }

  static toSummary(record) {
    return {
      id: record.id,
      recipient_email: record.recipient_email,
      token_count: record.token_count,
      state: ActionTokenService.deriveState(record),
      expires_at: new Date(record.expires_at).toISOString(),
      created_at: new Date(record.created_at).toISOString(),
      redeemed_at: record.redeemed_at
        ? new Date(record.redeemed_at).toISOString()
        : null,
    };
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

    const id = uuid.v4();
    const actionToken = ActionTokenService.signActionToken({
      jti: id,
      sub: recipient_email,
      sender_wallet_id: senderWalletId,
      token_ids: tokenIds,
    });

    const { exp } = ActionTokenService.verifyActionToken(actionToken);
    const expiresAt = new Date(exp * 1000).toISOString();

    await this._actionTokenRepository.create({
      id,
      sender_wallet_id: senderWalletId,
      recipient_email,
      token_ids: JSON.stringify(tokenIds),
      token_count: tokenIds.length,
      state: STATE.active,
      expires_at: expiresAt,
    });

    return {
      id,
      action_token: actionToken,
      expires_at: expiresAt,
      token_count: tokenIds.length,
    };
  }

  // Sender lists their outstanding/past links.
  async list(walletLoginId, { state, limit, offset } = {}) {
    const { result, count } = await this._actionTokenRepository.getBySender(
      walletLoginId,
      { state, limit, offset },
    );
    return {
      action_tokens: result.map((r) => ActionTokenService.toSummary(r)),
      total: count,
    };
  }

  // Sender revokes an outstanding link so it can no longer be redeemed.
  async cancel(id, walletLoginId) {
    let record;
    try {
      record = await this._actionTokenRepository.getById(id);
    } catch (e) {
      throw new HttpError(404, 'Action token not found');
    }
    if (record.sender_wallet_id !== walletLoginId) {
      throw new HttpError(404, 'Action token not found');
    }
    if (record.state !== STATE.active) {
      throw new HttpError(
        409,
        `Cannot cancel an action token in state '${record.state}'`,
      );
    }
    const updated = await this._actionTokenRepository.update({
      id,
      state: STATE.cancelled,
    });
    return ActionTokenService.toSummary(updated);
  }

  async redeem({ action_token, wallet }, walletLoginId) {
    const payload = ActionTokenService.verifyActionToken(action_token);

    // Enforce the persisted lifecycle when the link was issued with a record.
    let record;
    if (payload.jti) {
      try {
        record = await this._actionTokenRepository.getById(payload.jti);
      } catch (e) {
        record = undefined;
      }
      if (record) {
        if (record.state === STATE.cancelled) {
          throw new HttpError(409, 'ERROR: ActionToken has been cancelled');
        }
        if (record.state === STATE.redeemed) {
          throw new HttpError(
            409,
            'ERROR: ActionToken has already been redeemed',
          );
        }
      }
    }

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

    const result = await this._transferService.redeemActionToken({
      senderWalletId: payload.sender_wallet_id,
      receiverWalletId,
      tokenIds: payload.token_ids,
    });

    if (record) {
      await this._actionTokenRepository.update({
        id: record.id,
        state: STATE.redeemed,
        redeemed_by_wallet_id: receiverWalletId,
        redeemed_at: new Date().toISOString(),
      });
    }

    return result;
  }
}

ActionTokenService.STATE = STATE;

module.exports = ActionTokenService;
