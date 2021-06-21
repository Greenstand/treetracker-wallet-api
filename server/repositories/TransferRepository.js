const expect = require("expect-runtime");
const knex = require("../database/knex");
const Transfer = require("../models/Transfer");
const BaseRepository = require("./BaseRepository");
const Session = require("../models/Session");
const log = require("loglevel");

class TransferRepository extends BaseRepository{

  constructor(session){
    super("transfer", session);
    this._tableName = "transfer";
    this._session = session;
  }

  async create(object){
    object.type = Transfer.TYPE.send;
    object.active = true;
    const result = await super.create(object);
    expect(result).match({
      id: expect.anything(),
    });
    return result;
  }

  async getPendingTransfers(id){
    return await this._session.getDB()(this._tableName).where({
      destination_wallet_id: id,
      state: Transfer.STATE.pending,
    });
  }

  /*
   * To calculate the sum of impact value of a transfer
   */
  async getImpactValue(transferId){
    const result = await this._session.getDB().raw(
      `
      SELECT sum(t.value) as impact_value_transferred FROM "token" t
      LEFT JOIN "transaction" tr 
      ON t.id = tr.token_id 
      WHERE tr.transfer_id = ? 
      `,
      [transferId]
    );
    log.debug("sum impact value:", result);
    return parseInt(result.rows[0].impact_value_transferred);
  }

}

module.exports = TransferRepository;
