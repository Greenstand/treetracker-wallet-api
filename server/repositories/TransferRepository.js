const expect = require('expect-runtime');
const knex = require('../database/knex');
const Transfer = require('../models/Transfer');
const BaseRepository = require('./BaseRepository');
const Session = require('../database/Session');

class TransferRepository extends BaseRepository {
  constructor(session) {
    super('transfer', session);
    this._tableName = 'transfer';
    this._session = session;
  }

  async create(object) {
    object.type = Transfer.TYPE.send;
    object.active = true;
    const result = await super.create(object);
    expect(result).match({
      id: expect.anything(),
    });
    return result;
  }

  async getPendingTransfers(id) {
    return await this._session.getDB()(this._tableName).where({
      destination_wallet_id: id,
      state: Transfer.STATE.pending,
    });
  }
}

module.exports = TransferRepository;
