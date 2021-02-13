const log = require("loglevel");
const TokenRepository = require("../repositories/TokenRepository");
const TransactionRepository = require("../repositories/TransactionRepository");
const expect = require("expect-runtime");
const HttpError = require("../utils/HttpError");
const { validate: uuidValidate } = require('uuid');

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
        capture: `/webmap/trees?treeid=${this._JSON.tree_id}`
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
    log.debug("Token complet transfer");
    await this.tokenRepository.update({
      id: this._id,
      transfer_pending: false,
      transfer_pending_id: transfer.id,
      wallet_id: transfer.destination_wallet_id,
    });
    await this.transactionRepository.create({
      token_id: this._id,
      transfer_id: transfer.id,
      source_wallet_id: transfer.source_wallet_id,
      destination_wallet_id: transfer.destination_wallet_id,
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
    expect(wallet).defined();
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

  async getUUID(){
    const json = await this.toJSON();
    return json.uuid;
  }

  async getTransactions(){
    const transactions = await this.transactionRepository.getByFilter({
      token_id: this._id,
    });
    return transactions;
  }

}

module.exports = Token;
