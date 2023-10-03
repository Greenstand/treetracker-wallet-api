const log = require('loglevel');
const WalletRepository = require('../repositories/WalletRepository');
const TrustRepository = require('../repositories/TrustRepository');
const TrustRelationshipEnums = require('../utils/trust-enums');
const HttpError = require('../utils/HttpError');
const TokenRepository = require('../repositories/TokenRepository');

class Wallet {
  constructor(session) {
    this._session = session;
    this._walletRepository = new WalletRepository(session);
    this._trustRepository = new TrustRepository(session);
    this._tokenRepository = new TokenRepository(session);
  }

  async createWallet(loggedInWalletId, wallet) {
    // check name
    try {
      await this._walletRepository.getByName(wallet);
      throw new HttpError(409, `The wallet "${wallet}" already exists`);
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

  async getById(id) {
    return this._walletRepository.getById(id);
  }

  async getWallet(walletId) {
    const wallet = await this._walletRepository.getById(walletId);
    const tokenCount = await this._tokenRepository.countByFilter({
      wallet_id: walletId,
    });
    const walletName = wallet.name;
    delete wallet.password;
    delete wallet.salt;
    delete wallet.created_at;
    delete wallet.name;
    return { ...wallet, wallet: walletName, tokens_in_wallet: tokenCount };
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
  // async checkTrustRequestSentToMe(requestType, sourceWalletId) {
  //   // pass
  // }

  /*
   * I have control over given wallet
   */
  async hasControlOver(parentId, childId) {
    // if the given wallet is me, then pass
    if (parentId === childId) {
      log.debug('The same wallet');
      return true;
    }
    // check sub wallet
    const result = await this.getSubWallets(parentId, childId);

    if (result.length) {
      return true;
    }
    return false;
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
            { actor_wallet_id: parentId },
            {
              request_type:
                TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
            },
            { state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted },
          ],
        },
        {
          and: [
            {
              request_type:
                TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
            },
            { target_wallet_id: parentId },
            { state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted },
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
  async getAllWallets(
    id,
    limitOptions,
    name,
    sort_by,
    order,
    created_at_start_date,
    created_at_end_date,
    getCount,
  ) {
    return this._walletRepository.getAllWallets(
      id,
      limitOptions,
      name,
      sort_by,
      order,
      created_at_start_date,
      created_at_end_date,
      getCount,
    );
  }
}

module.exports = Wallet;
