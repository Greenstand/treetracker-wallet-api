const log = require("loglevel");
const TokenRepository = require("../repositories/TokenRepository");
const TransactionRepository = require("../repositories/TransactionRepository");
const expect = require("expect-runtime");
const HttpError = require("../utils/HttpError");

class Token{
  
  constructor(idOrObject){
    if(typeof idOrObject === "number"){
      this._id = idOrObject;
    }else if(typeof idOrObject === "object" && typeof idOrObject.id === "number"){
      this._id = idOrObject.id;
      this._json = idOrObject;
    }else{
      throw new HttpError(500, `wrong contructor:${idOrObject}`);
    }
    this.tokenRepository = new TokenRepository();
    this.transactionRepository = new TransactionRepository();
  }

  getId(){
    return this._id;
  }

  async toJSON(){
    const token = await this.tokenRepository.getById(this._id);
    return token;
  }

  /*
   * To transfer this token according the transfer object
   */
  async completeTransfer(transfer){
    log.debug("Token complet transfer");
    await this.tokenRepository.update({
      id: this._id,
      transfer_pending: false,
      transfer_pending_id: transfer.id,
      entity_id: transfer.destination_entity_id,
    });
    await this.transactionRepository.create({
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
    expect(transfer).match({
      id: expect.any(Number),
    });
    await this.tokenRepository.update({
      id: this._id,
      transfer_pending: true,
      transfer_pending_id: transfer.id,
    });
  }

  async cancelTransfer(transfer){
    log.debug("Token cancel transfer");
    await this.tokenRepository.update({
      id: this._id,
      transfer_pending: false,
      transfer_pending_id: transfer.id,
    });
  }

}

module.exports = Token;
