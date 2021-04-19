const log = require("loglevel");
const TokenRepository = require("../repositories/TokenRepository");
const TransactionRepository = require("../repositories/TransactionRepository");
const HttpError = require("../utils/HttpError");
const { validate: uuidValidate } = require('uuid');
const Joi = require("joi");
const expect = require("expect-runtime");

class Token{
  
  constructor(idOrJSON, session){
    if(uuidValidate(idOrJSON)){
      this._id = idOrJSON;
    }else if(typeof idOrJSON === "object" && uuidValidate(idOrJSON.id) ){
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
    }else{
      this._JSON = await this.tokenRepository.getById(this._id);
    }
    //deal with tree links
    const result = {
      ...this._JSON,
      links: {
        capture: `/webmap/tree?uuid=${this._JSON.capture_id}`
      }
    }
    return result;
  }

  clearJSON(){
    this._JSON = undefined;
  }

  /*
   * To transfer this token according the transfer object
   */
  async completeTransfer(transfer){
    
    log.debug("Token complete transfer");
    log.debug({
      id: this._id,
      transfer_pending: false,
      transfer_pending_id: null,
      wallet_id: transfer.destination_wallet_id,
    });

    await this.tokenRepository.update({
      id: this._id,
      transfer_pending: false,
      transfer_pending_id: null,
      wallet_id: transfer.destination_wallet_id,
      claim: transfer.claim ? true : false
    });
    await this.transactionRepository.create({
      token_id: this._id,
      transfer_id: transfer.id,
      //TODO: add a boolean for claim.
      claim: transfer.claim,
      source_wallet_id: transfer.source_wallet_id,
      destination_wallet_id: transfer.destination_wallet_id,
    });
  }

  /*
   * To pending this token on the given transfer
   */
  async pendingTransfer(transfer){

    Joi.assert(
      transfer.id,
      Joi.string().guid()
    )

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
      transfer_pending_id: null
    });
  }

  async belongsTo(wallet){

    Joi.assert(
      wallet.getId(),
      Joi.string().guid()
    )

    const json = await this.toJSON();
    if(json.wallet_id === wallet.getId()){
      return true;
    }else{
      return false;
    }
  }

  async beAbleToTransfer(){
    const json = await this.toJSON();
    if(json.transfer_pending === false){
      return true;
    }else{
      return false;
    }
  }

  async getTransactions(){
    const transactions = await this.transactionRepository.getByFilter({
      token_id: this._id,
    });
    return transactions;
  }

}

module.exports = Token;
