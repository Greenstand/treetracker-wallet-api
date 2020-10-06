const knex = require("../database/knex");
const Transfer = require("../models/Transfer");

class TransferRepository{

  constructor(){
  }

  async create(object){
    object.type = Transfer.TYPE.send;
    object.state = Transfer.STATE.pending;
    object.active = true;
    await knex("wallets.transfer").insert(object);
    //get the inserted object, TODO there must be better way to do so.
    const result = await knex("wallets.transfer").orderBy("id", "desc").limit(1);
    return result[0];
  }

  async getPendingTransfers(id){
    return await knex("wallets.transfer").where({
      destination_entity_id: id,
      state: Transfer.STATE.pending,
    });
  }
}

module.exports = TransferRepository;
