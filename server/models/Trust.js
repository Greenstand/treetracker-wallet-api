const TrustRepository = require('../repositories/TrustRepository');
const HttpError = require('../utils/HttpError');
const TrustRelationship = require('../utils/trust-enums');
const Wallet = require('./Wallet');

class Trust {
  constructor(session) {
    this._session = session;
    this._trustRepository = new TrustRepository(session);
  }

  /*
   * Get trust relationships by filters, setting filter to undefined to allow all data
   */
  async getTrustRelationships({
    walletId,
    state,
    type,
    request_type,
    offset,
    limit,
  }) {
    const filter = {
      and: [
        {
          or: [
            {
              actor_wallet_id: walletId,
            },
            {
              target_wallet_id: walletId,
            },
            {
              originator_wallet_id: walletId,
            },
          ],
        },
      ],
    };
    if (state) {
      filter.and.push({ state });
    }
    if (type) {
      filter.and.push({ type });
    }
    if (request_type) {
      filter.and.push({ request_type });
    }
    return this._trustRepository.getByFilter(filter, { offset, limit });
  }

  /*
   * Get all relationships which has been accepted
   */
  async getTrustRelationshipsTrusted(walletId) {
    return this.getTrustRelationships({
      walletId,
      state: TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
    });
  }

  /*
   * send a trust request to another wallet
   */
  async requestTrustFromAWallet({
    requestType,
    requesterWallet,
    requesteeWallet,
    originatorWallet,
  }) {
    log.debug('request trust...');

    const walletModel = new Wallet(this._session);

    /*
     * Translate the requester/ee to actor/target
     */
    const actorWallet = requesterWallet; // case of: manage/send
    const targetWallet = requesteeWallet; // case of: mange/send
    //    if(
    //      requestType === TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive ||
    //      requestType === TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.yield){
    //      actorWallet = requesteeWallet;
    //      targetWallet = requesterWallet;
    //    }

    // check if the orginator can control the actor
    const hasControl = await walletModel.hasControlOver(
      originatorWallet.id,
      actorWallet.id,
    );

    if (!hasControl) {
      throw new HttpError(403, 'Have no permission to deal with this actor');
    }

    // check if the target wallet can accept the request
    // function below currently empty
    // await walletModel.checkTrustRequestSentToMe(
    //   requestType,
    //   originatorWallet.id,
    //   targetWallet.id,
    // );

    // create this request
    const trustRelationship = {
      type: TrustRelationship.getTrustTypeByRequestType(requestType),
      request_type: requestType,
      actor_wallet_id: actorWallet.id,
      originator_wallet_id: originatorWallet.id,
      target_wallet_id: targetWallet.id,
      state: TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested,
    };
    await this.checkDuplicateRequest({
      walletId: originatorWallet,
      trustRelationship,
    });
    const result = await this._trustRepository.create(trustRelationship);

    return {
      id: result.id,
      actor_wallet: actorWallet.name,
      originator_wallet: originatorWallet.name,
      target_wallet: targetWallet.name,
      type: result.type,
      request_type: result.request_type,
      state: result.state,
      created_at: result.created_at,
      updated_at: result.updated_at,
      active: result.active,
    };
  }

  // check if I (current wallet) can add a new trust like this
  async checkDuplicateRequest({ walletId, trustRelationship }) {
    const trustRelationships = await this.getTrustRelationships({ walletId });
    if (
      trustRelationship.type === TrustRelationship.ENTITY_TRUST_TYPE.send ||
      trustRelationship.type === TrustRelationship.ENTITY_TRUST_TYPE.manage
    ) {
      if (
        trustRelationships.some((e) => {
          if (
            (e.request_type === trustRelationship.request_type &&
              (e.state ===
                TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested ||
                e.state ===
                  TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted) &&
              e.actor_wallet_id === trustRelationship.actor_wallet_id &&
              e.target_wallet_id === trustRelationship.target_wallet_id) ||
            (e.request_type !== trustRelationship.request_type &&
              (e.state ===
                TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested ||
                e.state ===
                  TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted) &&
              e.actor_wallet_id === trustRelationship.target_wallet_id &&
              e.target_wallet_id === trustRelationship.actor_wallet_id)
          ) {
            return true;
          }
          return false;
        })
      ) {
        log.debug('Has duplicated trust');
        throw new HttpError(
          403,
          'The trust relationship has been requested or trusted',
        );
      }
    } else {
      throw HttpError(500, 'Not supported type');
    }
    log.debug('Has no duplicated trust');
  }

  async checkManageCircle({ walletId, trustRelationship }) {
    const trustRelationshipTrusted = await this.getTrustRelationshipsTrusted(
      walletId,
    );
    // just manage type of trust relationship
    if (trustRelationship.type === TrustRelationship.ENTITY_TRUST_TYPE.manage) {
      // if is manage request
      if (
        trustRelationship.request_type ===
        TrustRelationship.ENTITY_TRUST_TYPE.manage
      ) {
        if (
          trustRelationshipTrusted.some((e) => {
            if (
              (e.type === TrustRelationship.ENTITY_TRUST_TYPE.manage &&
                e.request_type ===
                  TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.manage &&
                e.actor_wallet_id === trustRelationship.target_wallet_id &&
                e.target_wallet_id === trustRelationship.actor_wallet_id) ||
              (e.type === TrustRelationship.ENTITY_TRUST_TYPE.manage &&
                e.request_type ===
                  TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.yield &&
                e.actor_wallet_id === trustRelationship.actor_wallet_id &&
                e.target_wallet_id === trustRelationship.target_wallet_id)
            ) {
              return true;
            }
            return false;
          })
        ) {
          throw new HttpError(
            403,
            'Operation forbidden, because this would lead to a management circle',
          );
        }
      } else if (
        trustRelationship.request_type ===
        TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.yield
      ) {
        if (
          trustRelationshipTrusted.some((e) => {
            if (
              (e.type === TrustRelationship.ENTITY_TRUST_TYPE.manage &&
                e.request_type ===
                  TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.yield &&
                e.actor_wallet_id === trustRelationship.target_wallet_id &&
                e.target_wallet_id === trustRelationship.actor_wallet_id) ||
              (e.type === TrustRelationship.ENTITY_TRUST_TYPE.manage &&
                e.request_type ===
                  TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.manage &&
                e.actor_wallet_id === trustRelationship.actor_wallet_id &&
                e.target_wallet_id === trustRelationship.target_wallet_id)
            ) {
              return true;
            }
            return false;
          })
        ) {
          throw new HttpError(
            403,
            'Operation forbidden, because this would lead to a management circle',
          );
        }
      }
    }
  }

  /*
   * Get all the trust relationships request to me
   */
  async getTrustRelationshipsRequestedToMe(walletId) {
    const walletModel = new Wallet(this._session);
    const allWallets = await walletModel.getAllWallets(walletId);
    const allTrustRelationships = [];
    for (const wallet of allWallets) {
      const list = await this.getTrustRelationships({ walletId: wallet.id });
      allTrustRelationships.push(...list);
    }
    const walletIds = [...allWallets.map((e) => e.id)];
    return allTrustRelationships.filter((trustRelationship) => {
      return walletIds.includes(trustRelationship.target_wallet_id);
    });
  }

  /*
   * Accept a trust relationship request
   */
  async acceptTrustRequestSentToMe({ trustRelationshipId, walletId }) {
    const trustRelationships = await this.getTrustRelationshipsRequestedToMe(
      walletId,
    );
    const trustRelationship = trustRelationships.reduce((a, c) => {
      if (c.id === trustRelationshipId) {
        return c;
      }
      return a;
    }, undefined);

    if (!trustRelationship) {
      throw new HttpError(
        403,
        'Have no permission to accept this relationship',
      );
    }
    await this.checkManageCircle({ walletId, trustRelationship });
    trustRelationship.state = TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted;
    const json = await this._trustRepository.update(trustRelationship);
    return json;
  }

  /*
   * Decline a trust relationship request
   */
  async declineTrustRequestSentToMe({ walletId, trustRelationshipId }) {
    const trustRelationships = await this.getTrustRelationshipsRequestedToMe(
      walletId,
    );
    const trustRelationship = trustRelationships.reduce((a, c) => {
      if (c.id === trustRelationshipId) {
        return c;
      }
      return a;
    }, undefined);

    if (!trustRelationship) {
      throw new HttpError(
        403,
        'Have no permission to decline this relationship',
      );
    }
    trustRelationship.state =
      TrustRelationship.ENTITY_TRUST_STATE_TYPE.canceled_by_target;
    const json = await this.trustRepository.update(trustRelationship);
    return json;
  }

  /*
   * Cancel a trust relationship request
   */
  async cancelTrustRequestSentToMe({ trustRelationshipId, walletId }) {
    const trustRelationships = await this._trustRepository.getByFilter({
      id: trustRelationshipId,
    });
    const [trustRelationship] = trustRelationships;
    if (trustRetrustRelationship?.originator_wallet_id !== walletId) {
      throw new HttpError(
        403,
        'Have no permission to cancel this relationship',
      );
    }
    trustRelationship.state =
      TrustRelationship.ENTITY_TRUST_STATE_TYPE.cancelled_by_originator;
    const json = await this._trustRepository.update(trustRelationship);
    return { ...trustRelationship, updated_at: json.updated_at };
  }
}

module.exports = Trust;
