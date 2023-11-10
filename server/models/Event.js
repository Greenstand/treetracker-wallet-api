// const Joi = require('joi');
const EventRepository = require('../repositories/EventRepository');
// const WalletService = require('../services/WalletService');
// const HttpError = require('../utils/HttpError');

class Event {
  constructor(session) {
    this._eventRepository = new EventRepository(session);
    // this._walletService = new WalletService();
  }

  async getAllEvents(walletId, limit, since) {
    const filter = {
      and: [],
    };

    if (walletId) {
      filter.and.push({
        wallet_id: walletId,
      });
    }

    if (since) {
      filter.and.push({ after: { 'wallet_event.created_at': since } });
    }

    const events = await this._eventRepository.getAllEvents(filter, limit);

    return events.map((eventObject) => {
      return {
        ...eventObject,
      };
    });
  }

  async logEvent({ wallet_id, type, payload }) {
    const event = await this._eventRepository.create({
      wallet_id,
      type,
      payload,
    });

    return event;
  }
}

module.exports = Event;
