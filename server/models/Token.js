const log = require("loglevel");
const TokenRepository = require("../repositories/TokenRepository");
const TransactionRepository = require("../repositories/TransactionRepository");
const expect = require("expect-runtime");

class Token{
  
  constructor(id){
    this._id = id;
    this.tokenRepository = new TokenRepository();
    this.transactionRepository = new TransactionRepository();
  }

  async toJSON(){
    const token = await this.tokenRepository.getById(this._id);
    return token;
  }

  /*
   * To transfer this token according the transfer object
   */
  async completeTransfer(transfer){
    this.tokenRepository.update({
      transfer_pending: false,
      transfer_pending_id: transfer.id,
    });
    this.transactionRepository.create({
      token_id: this._id,
      transfer_id: transfer.id,
      source_entity_id: transfer.source_entity_id,
      destination_entity_id: transfer.destination_entity_id,
    });
  }

  /*
   * To pending this token on the given transfer
   */
  async pendingTransfer(transfer){
    this.tokenRepository.update({
      transfer_pending: true,
      transfer_pending_id: transfer.id,
    });
  }

}

module.exports = Token;
