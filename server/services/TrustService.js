const Trust = require('../models/Trust');
const Session = require('../database/Session');
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
    const wallets = await walletModel.getAllWallets(walletId);

    const alltrustRelationships = [];

    for (const w of wallets) {
      const trustRelationships = await this.getTrustRelationships({
        walletId: w.id,
        state,
        type,
        request_type,
      });
      alltrustRelationships.push(...trustRelationships);
    }

    // remove possible duplicates
    const ids = {};
    const finalTrustRelationships = [];

    for (const tr of alltrustRelationships) {
      if (ids[tr.id]) continue;
      finalTrustRelationships.push(tr);
      ids[tr.id] = 1;
    }

    return finalTrustRelationships;
  }

  async createTrustRelationship({
    walletId,
    requesteeWallet,
    requesterWallet,
    trustRequestType,
  }) {
    const walletService = new WalletService();
    const originatorWallet = await walletService.getById(walletId);
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

  async acceptTrustRequestSentToMe({ walletId, trustRelationshipId }) {
    return this._trust.acceptTrustRequestSentToMe({
      walletId,
      trustRelationshipId,
    });
  }

  async declineTrustRequestSentToMe({ walletId, trustRelationshipId }) {
    return this._trust.declineTrustRequestSentToMe({
      walletId,
      trustRelationshipId,
    });
  }

  async cancelTrustRequestSentToMe({ walletId, trustRelationshipId }) {
    return this._trust.cancelTrustRequestSentToMe({
      walletId,
      trustRelationshipId,
    });
  }
}

module.exports = TrustService;
