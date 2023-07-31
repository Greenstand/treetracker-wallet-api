const Event = require('../models/Event');
const WalletService = require('./WalletService');
const Session = require('../infra/database/Session');
const HttpError = require('../utils/HttpError');

class EventService {
  constructor() {
    this._session = new Session();
    this._event = new Event(this._session);
    this._walletService = new WalletService();
  }

  async getAllEvents({ wallet, limit, since, walletLoginId }) {
    let events = [];

    if (wallet) {
      const walletInstance = await this._walletService.getByName(wallet);
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

      events = await this._event.getAllEvents(walletInstance.id, limit, since);
    } else {
      events = await this._event.getAllEvents(walletLoginId, limit, since);
    }

    return events;
  }
}

module.exports = EventService;
