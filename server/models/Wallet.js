const log = require('loglevel');
const WalletRepository = require('../repositories/WalletRepository');
const TrustRepository = require('../repositories/TrustRepository');
const TrustRelationshipEnums = require('../utils/trust-enums');
const TransferRepository = require('../repositories/TransferRepository');
const HttpError = require('../utils/HttpError');

class Wallet {
  constructor(session) {
    this._session = session;
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
    return this.trustRepository.getByTargetId(this._id);
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
  // async checkTrustRequestSentToMe(requestType, sourceWalletId) {
  //   // pass
  // }

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
              request_type:
                TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
            },

            {
              state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
            },
          ],
        },
        {
          and: [
            {
              request_type:
                TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
            },
            {
              target_wallet_id: parentId,
            },
            {
              state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
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
