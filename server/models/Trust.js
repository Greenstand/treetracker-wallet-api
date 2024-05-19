/* eslint-disable no-unused-vars */
const Joi = require('joi');
const log = require('loglevel');
const TrustRepository = require('../repositories/TrustRepository');
const HttpError = require('../utils/HttpError');
const TrustRelationshipEnums = require('../utils/trust-enums');
const Wallet = require('./Wallet');

class Trust {
  constructor(session) {
    this._session = session;
    this._trustRepository = new TrustRepository(session);
  }

  async getTrustRelationshipsById(id) {
    return this._trustRepository.getById(id);
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
    sort_by,
    order,
  }) {
    const filter = {
      and: [
        {
          or: [
            { actor_wallet_id: walletId },
            { target_wallet_id: walletId },
            { originator_wallet_id: walletId },
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
   * Get all trust relationships by filters, setting filter to undefined to allow all data
   */
  async getAllTrustRelationships({
    walletId,
    state,
    type,
    request_type,
    offset,
    limit,
    sort_by,
    order,
  }) {
    const filter = {
      and: [{ 'originator_wallet.id': walletId }],
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
    return this._trustRepository.getAllByFilter(filter, {
      offset,
      limit,
      sort_by,
      order,
    });
  }

  /*
   * Get all relationships which has been accepted
   */
  async getTrustRelationshipsTrusted(walletId) {
    return this.getTrustRelationships({
      walletId,
      state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
    });
  }

  /*
   * send a trust request to another wallet
   */
  async requestTrustFromAWallet({
    trustRequestType,
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
    //      trustRequestType === TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.receive ||
    //      trustRequestType === TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.yield){
    //      actorWallet = requesteeWallet;
    //      targetWallet = requesterWallet;
    //    }

    // check if the orginator can control the actor
    const hasControlOverActor = await walletModel.hasControlOver(
      originatorWallet.id,
      actorWallet.id,
    );

    // originating wallet has no permission to send request from actor wallet
    if (!hasControlOverActor) {
      throw new HttpError(403, 'Have no permission to deal with this actor');
    }

    // check if originator can control the target
    const hasControlOverTarget = await walletModel.hasControlOver(
      originatorWallet.id,
      targetWallet.id,
    );

    // cannot send trust relationship requests from one sub wallet to another
    if (
      originatorWallet.id !== actorWallet.id &&
      originatorWallet.id !== targetWallet.id &&
      hasControlOverActor &&
      hasControlOverTarget
    ) {
      throw new HttpError(
        409,
        'Cannot send trust relationship request to a sub wallet with the same parent',
      );
    }

    // originating wallet doesn't need to send requests to a sub wallet it manages
    if (hasControlOverTarget) {
      throw new HttpError(
        409,
        'The requesting wallet already manages the target wallet',
      );
    }

    // check if the target wallet can accept the request
    // function below currently empty
    // await walletModel.checkTrustRequestSentToMe(
    //   trustRequestType,
    //   originatorWallet.id,
    //   targetWallet.id,
    // );

    // create this request
    const trustRelationship = {
      type: TrustRelationshipEnums.getTrustTypeByRequestType(trustRequestType),
      request_type: trustRequestType,
      actor_wallet_id: actorWallet.id,
      originator_wallet_id: originatorWallet.id,
      target_wallet_id: targetWallet.id,
      state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
    };
    await this.checkDuplicateRequest({
      walletId: originatorWallet.id,
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
      actor_wallet_id: actorWallet.id,
      originator_wallet_id: originatorWallet.id,
      target_wallet_id: targetWallet.id,
    };
  }

  // check if I (current wallet) can add a new trust like this
  async checkDuplicateRequest({ walletId, trustRelationship }) {
    const trustRelationships = await this.getTrustRelationships({ walletId });
    if (
      trustRelationship.type ===
        TrustRelationshipEnums.ENTITY_TRUST_TYPE.send ||
      trustRelationship.type === TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage
    ) {
      if (
        trustRelationships.some((e) => {
          if (
            (e.request_type === trustRelationship.request_type &&
              (e.state ===
                TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested ||
                e.state ===
                  TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted) &&
              e.actor_wallet_id === trustRelationship.actor_wallet_id &&
              e.target_wallet_id === trustRelationship.target_wallet_id) ||
            (e.request_type !== trustRelationship.request_type &&
              (e.state ===
                TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested ||
                e.state ===
                  TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted) &&
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
          409,
          'The trust relationship has been requested or trusted',
        );
      }
    } else {
      throw new HttpError(500, 'Not supported type');
    }
    log.debug('Has no duplicated trust');
  }

  async checkManageCircle({ walletId, trustRelationship }) {
    const trustRelationshipTrusted = await this.getTrustRelationshipsTrusted(
      walletId,
    );
    // just manage type of trust relationship
    if (
      trustRelationship.type === TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage
    ) {
      // if is manage request
      if (
        trustRelationship.request_type ===
        TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage
      ) {
        if (
          trustRelationshipTrusted.some((e) => {
            if (
              (e.type === TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage &&
                e.request_type ===
                  TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage &&
                e.actor_wallet_id === trustRelationship.target_wallet_id &&
                e.target_wallet_id === trustRelationship.actor_wallet_id) ||
              (e.type === TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage &&
                e.request_type ===
                  TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield &&
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
        TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield
      ) {
        if (
          trustRelationshipTrusted.some((e) => {
            if (
              (e.type === TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage &&
                e.request_type ===
                  TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield &&
                e.actor_wallet_id === trustRelationship.target_wallet_id &&
                e.target_wallet_id === trustRelationship.actor_wallet_id) ||
              (e.type === TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage &&
                e.request_type ===
                  TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage &&
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
    const { wallets: allWallets } = await walletModel.getAllWallets(
      walletId,
      undefined,
      undefined,
      'created_at',
      'desc',
    );
    const allTrustRelationships = [];
    await Promise.all(
      allWallets.map(async (wallet) => {
        const list = await this.getTrustRelationships({ walletId: wallet.id });
        allTrustRelationships.push(...list);
      }),
    );
    const walletIds = [...allWallets.map((e) => e.id)];
    return allTrustRelationships.filter((trustRelationship) => {
      return walletIds.includes(trustRelationship.target_wallet_id);
    });
  }

  async updateTrustState(trustRelationship, state) {
    const trustRelationshipToUpdate = { ...trustRelationship };

    trustRelationshipToUpdate.state = state;
    delete trustRelationshipToUpdate.originating_wallet;
    delete trustRelationshipToUpdate.actor_wallet;
    delete trustRelationshipToUpdate.target_wallet;

    const updatedTrustRelationship = await this._trustRepository.update(
      trustRelationshipToUpdate,
    );

    return { ...trustRelationship, ...updatedTrustRelationship };
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
        404,
        'No such trust relationship exists or it is not associated with the current wallet.',
      );
    }
    await this.checkManageCircle({ walletId, trustRelationship });

    return this.updateTrustState(
      trustRelationship,
      TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
    );
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
        404,
        'No such trust relationship exists or it is not associated with the current wallet.',
      );
    }

    return this.updateTrustState(
      trustRelationship,
      TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.canceled_by_target,
    );
  }

  /*
   * Cancel a trust relationship request
   */
  async cancelTrustRequest({ trustRelationshipId, walletId }) {
    const trustRelationships = await this._trustRepository.getByFilter({
      'wallet_trust.id': trustRelationshipId,
    });
    const [trustRelationship] = trustRelationships;

    if (!trustRelationship) {
      throw new HttpError(
        404,
        'No such trust relationship exists or it is not associated with the current wallet.',
      );
    }

    if (trustRelationship?.originator_wallet_id !== walletId) {
      throw new HttpError(
        403,
        'Have no permission to cancel this relationship',
      );
    }

    return this.updateTrustState(
      trustRelationship,
      TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.cancelled_by_originator,
    );
  }

  /*
   * To check if the indicated trust relationship exist between the source and
   * target wallet
   */
  async hasTrust(walletLoginId, trustType, senderWallet, receiveWallet) {
    Joi.assert(
      trustType,
      Joi.string().valid(
        ...Object.values(TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE),
      ),
    );

    const trustRelationships = await this.getTrustRelationshipsTrusted(
      walletLoginId,
    );
    // check if the trust exist
    if (
      trustRelationships.some((trustRelationship) => {
        if (
          trustRelationship.actor_wallet_id === senderWallet.id &&
          trustRelationship.target_wallet_id === receiveWallet.id &&
          trustRelationship.request_type ===
            TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send
        ) {
          return true;
        }
        return false;
      }) ||
      trustRelationships.some((trustRelationship) => {
        if (
          trustRelationship.actor_wallet_id === receiveWallet.id &&
          trustRelationship.target_wallet_id === senderWallet.id &&
          trustRelationship.request_type ===
            TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.receive
        ) {
          return true;
        }
        return false;
      })
    ) {
      log.debug('check trust passed');
      return true;
    }
    return false;
  }

  async getTrustRelationshipById({ walletId, trustRelationshipId }) {
    const filter = {
      and: [
        {
          or: [
            { actor_wallet_id: walletId },
            { target_wallet_id: walletId },
            { originator_wallet_id: walletId },
          ],
        },
        {
          'wallet_trust.id': trustRelationshipId,
        },
      ],
    };

    const [trustRelationship] = await this._trustRepository.getByFilter(filter);

    if (!trustRelationship) {
      throw new HttpError(
        404,
        'No such trust relationship exists or it is not associated with the current wallet.',
      );
    }

    return trustRelationship;
  }

  // NOT YET IN USE
  //   /*
  //  * Get all the trust relationships I have requested
  //  */
  //   async getTrustRelationshipsRequested() {
  //     const result = await this.getTrustRelationships();
  //     return result.filter((trustRelationship) => {
  //       return trustRelationship.originator_wallet_id === this._id;
  //     });
  //   }

  //   /*
  //    * Get all the trust relationships targeted to me, means request
  //    * the trust from me
  //    */
  //   async getTrustRelationshipsTargeted() {
  //     return this.trustRepository.getByTargetId(this._id);
  //   }
}

module.exports = Trust;
