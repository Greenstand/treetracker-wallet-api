const Trust = require('../models/Trust');
const Session = require('../infra/database/Session');
const WalletService = require('./WalletService');
const EventService = require('./EventService');
const EventEnums = require('../utils/event-enum');
const HttpError = require('../utils/HttpError');
const Wallet = require('../models/Wallet');

class TrustService {
  constructor() {
    this._session = new Session();
    this._trust = new Trust(this._session);
    this._eventService = new EventService();
  }

  async getTrustRelationships(
    loggedInWalletId,
    managedWallets,
    { walletId, state, type, request_type, offset, limit,sort_by, order, search },
  ) {
    // check if wallet exists first
    // throws error if no wallet matching walletId exists
    const walletService = new WalletService();
    const hasControl = await walletService.hasControlOver(
      loggedInWalletId,
      walletId,
    );

    if (!hasControl) {
      throw new HttpError(
        422,
        'You do not have permission to update this wallet',
      );
    }

    return this._trust.getTrustRelationships({
      walletId,
      managedWallets,
      state,
      type,
      request_type,
      offset,
      limit,
      sort_by,
      order,
      search
    });

    // const count = await this._trust.getTrustRelationshipsCount({
    //   walletId,
    //   state,
    //   type,
    //   request_type,
    // });

    // return { result, count };
  }

  // limit and offset not feasible using the current implementation
  // except if done manually or coming up with a single query
  async getAllTrustRelationships({ walletId, state, type, request_type, search }) {
    const walletModel = new Wallet(this._session);
    const { wallets } = await walletModel.getAllWallets(
      walletId,
      undefined,
      undefined,
      'created_at',
      'desc',
    );

    const alltrustRelationships = [];
    const managedWallets = [];
    await Promise.all(
      wallets.map(async (w) => {
        const trustRelationships = await this.getTrustRelationships(walletId, managedWallets,{
          walletId: w.id,
          state,
          type,
          request_type,
          search
        });
        alltrustRelationships.push(...trustRelationships.result);
      }),
    );

    // remove possible duplicates
    const ids = {};
    const finalTrustRelationships = [];

    alltrustRelationships.forEach((tr) => {
      if (!ids[tr.id]) {
        finalTrustRelationships.push(tr);
        ids[tr.id] = 1;
      }
    });

    return finalTrustRelationships;
  }

  async createTrustRelationship({
    walletLoginId,
    requesteeWallet,
    requesterWallet,
    trustRequestType,
  }) {
    const walletService = new WalletService();
    const originatorWallet = await walletService.getById(walletLoginId);
    const requesteeWalletDetails = await walletService.getByName(
      requesteeWallet,
    );
    let requesterWalletDetails;
    if (requesterWallet) {
      requesterWalletDetails = await walletService.getByName(requesterWallet);
    } else {
      requesterWalletDetails = originatorWallet;
    }

    const trustRelationship = await this._trust.requestTrustFromAWallet({
      trustRequestType,
      requesterWallet: requesterWalletDetails,
      requesteeWallet: requesteeWalletDetails,
      originatorWallet,
    });

    // the log should show up on both requester and requestee
    await this._eventService.logEvent({
      wallet_id: requesterWalletDetails.id,
      type: EventEnums.TRUST.trust_request,
      payload: {
        requesteeWallet: requesteeWalletDetails.name,
        requesterWallet: requesterWalletDetails.name,
        trustRequestType,
      },
    });

    // the log should show up on both requester and requestee
    await this._eventService.logEvent({
      wallet_id: requesteeWalletDetails.id,
      type: EventEnums.TRUST.trust_request,
      payload: {
        requesteeWallet: requesteeWalletDetails.name,
        requesterWallet: requesterWalletDetails.name,
        trustRequestType,
      },
    });

    return trustRelationship;
  }

  async acceptTrustRequestSentToMe({ walletLoginId, trustRelationshipId }) {
    const trustRelationship = await this._trust.getTrustRelationshipsById(
      trustRelationshipId,
    );

    // the log should show up on both requester and requestee
    await this._eventService.logEvent({
      wallet_id: walletLoginId,
      type: EventEnums.TRUST.trust_request_granted,
      payload: { trustRelationshipId },
    });

    // the log should show up on both requester and requestee
    await this._eventService.logEvent({
      wallet_id: trustRelationship.originator_wallet_id,
      type: EventEnums.TRUST.trust_request_granted,
      payload: { trustRelationshipId },
    });

    return this._trust.acceptTrustRequestSentToMe({
      walletId: walletLoginId,
      trustRelationshipId,
    });
  }

  async declineTrustRequestSentToMe({ walletLoginId, trustRelationshipId }) {
    const trustRelationship = await this._trust.getTrustRelationshipsById(
      trustRelationshipId,
    );

    // the log should show up on both requester and requestee
    await this._eventService.logEvent({
      wallet_id: walletLoginId,
      type: EventEnums.TRUST.trust_request_cancelled_by_target,
      payload: { trustRelationshipId },
    });

    // the log should show up on both requester and requestee
    await this._eventService.logEvent({
      wallet_id: trustRelationship.originator_wallet_id,
      type: EventEnums.TRUST.trust_request_cancelled_by_target,
      payload: { trustRelationshipId },
    });

    return this._trust.declineTrustRequestSentToMe({
      walletId: walletLoginId,
      trustRelationshipId,
    });
  }

  async cancelTrustRequest({ walletLoginId, trustRelationshipId }) {
    const trustRelationship = await this._trust.getTrustRelationshipsById(
      trustRelationshipId,
    );

    // the log should show up on both requester and requestee
    await this._eventService.logEvent({
      wallet_id: walletLoginId,
      type: EventEnums.TRUST.trust_request_cancelled_by_originator,
      payload: { trustRelationshipId },
    });

    // the log should show up on both requester and requestee
    await this._eventService.logEvent({
      wallet_id: trustRelationship.target_wallet_id,
      type: EventEnums.TRUST.trust_request_cancelled_by_originator,
      payload: { trustRelationshipId },
    });

    return this._trust.cancelTrustRequest({
      walletId: walletLoginId,
      trustRelationshipId,
    });
  }

  async trustRelationshipGetById({ walletLoginId, trustRelationshipId }) {
    return this._trust.getTrustRelationshipById({
      walletId: walletLoginId,
      trustRelationshipId,
    });
  }
}

module.exports = TrustService;
