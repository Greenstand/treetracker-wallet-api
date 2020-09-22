const expect = require('expect-runtime');
const HttpError = require("../utils/HttpError");
const EntityModel = require("../models/EntityModel");
const TrustModel = require("../models/TrustModel");

class TrustService{
  constructor(){
    this.trustModel = new TrustModel();
  }

  getTrustModel(){
    return this.trustModel;
  }

  async request(requestType, walletName){
    expect(requestType, () => new HttpError(`The trust request type must be one of ${Object.keys(TrustModel.ENTITY_TRUST_REQUEST_TYPE).join(',')}`, 400))
      .oneOf(Object.keys(TrustModel.ENTITY_TRUST_REQUEST_TYPE));
    expect(walletName, () => new HttpError("Invalid wallet name", 400))
      .match(/\S+/);
    
    //get wallet id
    const entityModel = new EntityModel();
    const wallet = await entityModel.getEntityByWalletName((walletName));
    await this.trustModel.create({
      request_type: requestType,
      target_entity_id: wallet.id,
    });
  }
}

module.exports = TrustService;
