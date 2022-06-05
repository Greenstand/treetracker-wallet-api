const TrustRepository = require('../repositories/TrustRepository');

class Trust {
  constructor(session) {
    this.trustRepository = new TrustRepository(session);
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
    return this.trustRepository.getByFilter(filter, { offset, limit });
  }
}

module.exports = Trust;
