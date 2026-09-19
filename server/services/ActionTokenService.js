/**
 * Action tokens for "send token by email"/share link: a signed, expiring token
 * authorizing a future transfer. The token itself stays stateless; a persisted
 * action_token row mirrors each issued link so the sender can list and revoke
 * outstanding links and redemption can reject cancelled/spent links (#846).
 * Generation also excludes tokens already promised by other outstanding
 * links, so two links in a row can't be issued for the same token (#847).
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
      sender_wallet_id: record.sender_wallet_id,
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

  // Every wallet the login wallet may act for: itself plus the wallets it
  // manages. Same rule TokenService.getById applies to token access.
  async _controlledWalletIds(walletLoginId) {
    const { wallets } = await this._walletService.getAllWallets(
      walletLoginId,
      undefined,
      undefined,
      'created_at',
      'desc',
      undefined,
      undefined,
      false,
      false,
    );
    return wallets.map((wallet) => wallet.id);
  }

  // Page through the sender wallet's tokens collecting ones not already
  // promised by another outstanding link, until `count` are found or the
  // wallet runs out.
  async _selectAvailableTokens(
    { sender_wallet, walletLoginId },
    count,
    reservedTokenIds,
  ) {
    const selected = [];
    const pageSize = Math.max(count * 2, 50);
    let offset = 0;

    // Bound the scan: a very large wallet still terminates in finite pages.
    for (let page = 0; page < 500 && selected.length < count; page += 1) {
      const tokens = await this._tokenService.getTokens({
        wallet: sender_wallet,
        limit: pageSize,
        offset,
        walletLoginId,
      });
      if (tokens.length === 0) break;

      // Pages are not ordered, so a token seen on one page can reappear on
      // the next: never promise the same token twice in one link.
      tokens.forEach((token) => {
        if (
          selected.length < count &&
          !reservedTokenIds.has(token.id) &&
          !selected.includes(token.id)
        ) {
          selected.push(token.id);
        }
      });

      if (tokens.length < pageSize) break; // that was the last page
      offset += pageSize;
    }

    return selected;
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

    // Tokens already promised by an outstanding link must not be handed out
    // again (#847), whether requested explicitly or drawn from a bundle. The
    // same token may have been promised from the sub-wallet that owns it
    // (bundle with sender_wallet) or from the login wallet (explicit ids), so
    // the live links of every wallet the login controls count.
    const reservedTokenIds =
      await this._actionTokenRepository.getActiveReservedTokenIds(
        await this._controlledWalletIds(walletLoginId),
      );

    if (tokens) {
      const resolved = await Promise.all(
        tokens.map((id) => this._tokenService.getById({ id, walletLoginId })),
      );
      tokenIds = resolved.map((token) => token.id);
      const alreadyReserved = tokenIds.filter((tid) =>
        reservedTokenIds.has(tid),
      );
      if (alreadyReserved.length > 0) {
        throw new HttpError(
          409,
          `Token(s) already committed to an outstanding share link: ${alreadyReserved.join(
            ', ',
          )}`,
        );
      }
    } else {
      tokenIds = await this._selectAvailableTokens(
        { sender_wallet, walletLoginId },
        bundle.bundle_size,
        reservedTokenIds,
      );
      if (tokenIds.length < bundle.bundle_size) {
        throw new HttpError(
          409,
          `Wallet does not have ${bundle.bundle_size} tokens available`,
        );
      }
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

  // Lists the links issued from the login wallet or any wallet it controls,
  // since generate() lets a sender share from a sub-wallet (#869).
  async list(walletLoginId, { state, limit, offset } = {}) {
    const senderWalletIds = await this._controlledWalletIds(walletLoginId);
    const { result, count } = await this._actionTokenRepository.getBySenders(
      senderWalletIds,
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
    const isOwner = await this._walletService.hasControlOver(
      walletLoginId,
      record.sender_wallet_id,
    );
    if (!isOwner) {
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
