const Trust = require('../models/Trust');
const Session = require('../infra/database/Session');
const Wallet = require('../models/Wallet');
const WalletService = require('./WalletService');

class TrustService {
  constructor() {
    this._session = new Session();
    this._trust = new Trust(this._session);
  }

  async getTrustRelationships({
    walletId,
    state,
    type,
    request_type,
    offset = 0,
    limit,
  }) {
    return this._trust.getTrustRelationships({
      walletId,
      state,
      type,
      request_type,
      offset,
      limit,
    });
  }

  // limit and offset not feasible using the current implementation
  // except if done manually or coming up with a single query
  async getAllTrustRelationships({ walletId, state, type, request_type }) {
    const walletModel = new Wallet(this._session);
    const { wallets } = await walletModel.getAllWallets(walletId);

    const alltrustRelationships = [];

    await Promise.all(
      wallets.map(async (w) => {
        const trustRelationships = await this.getTrustRelationships({
          walletId: w.id,
          state,
          type,
          request_type,
        });
        alltrustRelationships.push(...trustRelationships);
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

    return trustRelationship;
  }

  async acceptTrustRequestSentToMe({ walletLoginId, trustRelationshipId }) {
    return this._trust.acceptTrustRequestSentToMe({
      walletId: walletLoginId,
      trustRelationshipId,
    });
  }

  async declineTrustRequestSentToMe({ walletLoginId, trustRelationshipId }) {
    return this._trust.declineTrustRequestSentToMe({
      walletId: walletLoginId,
      trustRelationshipId,
    });
  }

  async cancelTrustRequest({ walletLoginId, trustRelationshipId }) {
    return this._trust.cancelTrustRequest({
      walletId: walletLoginId,
      trustRelationshipId,
    });
  }
}

module.exports = TrustService;
