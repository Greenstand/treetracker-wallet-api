const log = require("loglevel");
const TokenRepository = require("../repositories/TokenRepository");
const TransactionRepository = require("../repositories/TransactionRepository");
const expect = require("expect-runtime");
const HttpError = require("../utils/HttpError");
const Wallet = require("./Wallet");

class Token{
  
  constructor(idOrJSON, session){
    if(typeof idOrJSON === "number"){
      this._id = idOrJSON;
    }else if(typeof idOrJSON === "object" && typeof idOrJSON.id === "number"){
      this._id = idOrJSON.id;
      this._JSON = idOrJSON;
    }else{
      throw new HttpError(500, `wrong contructor:${idOrJSON}`);
    }
    this.tokenRepository = new TokenRepository(session);
    this.transactionRepository = new TransactionRepository(session);
    this._session = session;
  }

  getId(){
    return this._id;
  }

  async toJSON(){
    if(this._JSON){
      return this._JSON;
    }else{
      const token = await this.tokenRepository.getById(this._id);
      return token;
    }
  }

  clearJSON(){
    this._JSON = undefined;
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

  async belongsTo(wallet){
    expect(wallet).instanceOf(Wallet);
    const json = await this.toJSON();
    if(json.entity_id === wallet.getId()){
      return true;
    }else{
      return false;
    }
  }

}

module.exports = Token;
