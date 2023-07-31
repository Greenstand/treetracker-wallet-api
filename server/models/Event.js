const log = require('loglevel');
// const Joi = require('joi');
const EventRepository = require('../repositories/EventRepository');

class Event {
  constructor(session) {
    this._eventRepository = new EventRepository(session);
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

  async logEvent({ loggedInWalletId, type, payload }) {
    log.info(loggedInWalletId);
    const event = await this._eventRepository.create({
      wallet_id: loggedInWalletId,
      type,
      payload,
    });

    return event;
  }
}

module.exports = Event;
