// const expect = require('expect-runtime');
const Joi = require('joi');
const BaseRepository = require('./BaseRepository');
const TransferEnum = require('../utils/transfer-enum');

class TransferRepository extends BaseRepository {
  constructor(session) {
    super('transfer', session);
    this._tableName = 'transfer';
    this._session = session;
  }

  async create(objectParam) {
    const object = { ...objectParam };
    object.type = TransferEnum.TYPE.send;
    object.active = true;

    const result = await this._session
      .getDB()
      .with('inserted', (qb) => {
        qb.insert(object).into(this._tableName).returning('*');
      })
      .select(
        'inserted.*',
        'originator_wallet.name as originating_wallet',
        'source_wallet.name as source_wallet',
        'destination_wallet.name as destination_wallet',
      )
      .from('inserted')
      .leftJoin(
        'wallet as originator_wallet',
        'inserted.originator_wallet_id',
        '=',
        'originator_wallet.id',
      )
      .leftJoin(
        'wallet as source_wallet',
        'inserted.source_wallet_id',
        '=',
        'source_wallet.id',
      )
      .leftJoin(
        'wallet as destination_wallet',
        'inserted.destination_wallet_id',
        '=',
        'destination_wallet.id',
      );

    // expect(result[0]).match({
    //   id: expect.anything(),
    // });

    Joi.assert(result[0], Joi.object({
      id: Joi.exist()
    }).unknown());

    const transfer = result[0];
    return transfer;
  }

  async update(object) {
    const result = await this._session
      .getDB()
      .with('updated', (qb) => {
        qb.update(object)
          .into(this._tableName)
          .where('id', object.id)
          .returning('*');
      })
      .select(
        'updated.*',
        'originator_wallet.name as originating_wallet',
        'source_wallet.name as source_wallet',
        'destination_wallet.name as destination_wallet',
      )
      .from('updated')
      .leftJoin(
        'wallet as originator_wallet',
        'updated.originator_wallet_id',
        '=',
        'originator_wallet.id',
      )
      .leftJoin(
        'wallet as source_wallet',
        'updated.source_wallet_id',
        '=',
        'source_wallet.id',
      )
      .leftJoin(
        'wallet as destination_wallet',
        'updated.destination_wallet_id',
        '=',
        'destination_wallet.id',
      );

    const transfer = result[0];
    return transfer;
  }

  async getByFilter(filter, limitOptions) {
    const offset =
      limitOptions && limitOptions.offset ? limitOptions.offset : 0;
    let promise = this._session
      .getDB()
      .select(
        `transfer.*`,
        'originator_wallet.name as originating_wallet',
        'source_wallet.name as source_wallet',
        'destination_wallet.name as destination_wallet',
      )
      .table(this._tableName)
      .leftJoin(
        'wallet as originator_wallet',
        'transfer.originator_wallet_id',
        '=',
        'originator_wallet.id',
      )
      .leftJoin(
        'wallet as source_wallet',
        'transfer.source_wallet_id',
        '=',
        'source_wallet.id',
      )
      .leftJoin(
        'wallet as destination_wallet',
        'transfer.destination_wallet_id',
        '=',
        'destination_wallet.id',
      )
      .offset(offset)
      .where((builder) => this.whereBuilder(filter, builder));

    if (limitOptions && limitOptions.limit) {
      promise = promise.limit(limitOptions.limit);
    }
    const result = await promise;
    // expect(result).a(expect.any(Array));
    Joi.assert(result, Joi.array().required());
    return result;
  }

  async getPendingTransfers(wallet_id) {
    return this._session.getDB()(this._tableName).where({
      destination_wallet_id: wallet_id,
      state: TransferEnum.STATE.pending,
    });
  }
}

module.exports = TransferRepository;
