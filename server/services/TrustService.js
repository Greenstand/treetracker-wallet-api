const Trust = require('../models/Trust');
const Session = require('../database/Session');
const Wallet = require('../models/Wallet');

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
    offset,
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
}

module.exports = TrustService;
