const Event = require('../models/Event');
const WalletService = require('./WalletService');
const Session = require('../infra/database/Session');

class EventService {
  constructor() {
    this._session = new Session();
    this._event = new Event(this._session);
    this._walletService = new WalletService();
  }

  async getAllEvents({ wallet, limit, since, walletLoginId }) {
    let events = [];

    if (wallet) {
      const walletInstance = await this._walletService.hasControlOverByName(
        walletLoginId,
        wallet,
      );

      events = await this._event.getAllEvents(walletInstance.id, limit, since);
    } else {
      events = await this._event.getAllEvents(walletLoginId, limit, since);
    }

    return events;
  }

  async logEvent({ wallet_id, type, payload }) {
    const event = await this._event.logEvent({
      wallet_id,
      type,
      payload,
    });

    return event;
  }
}

module.exports = EventService;
