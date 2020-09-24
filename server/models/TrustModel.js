const expect = require('expect-runtime');
const HttpError = require("../utils/HttpError");
const EntityRepository = require("../repositories/EntityRepository");
const TrustRepository = require("../repositories/TrustRepository");

class TrustModel{
  constructor(){
    this.trustRepository = new TrustRepository();
  }

  getTrustModel(){
    return this.trustRepository;
  }

  async request(requestType, walletName){
    expect(requestType, () => new HttpError(400, `The trust request type must be one of ${Object.keys(TrustRepository.ENTITY_TRUST_REQUEST_TYPE).join(',')}`))
      .oneOf(Object.keys(TrustRepository.ENTITY_TRUST_REQUEST_TYPE));
    expect(walletName, () => new HttpError(400, "Invalid wallet name"))
      .match(/\S+/);
    
    //get wallet id
    const entityModel = new EntityRepository();
    const wallet = await entityModel.getEntityByWalletName((walletName));
    const result = await this.trustRepository.create({
      request_type: requestType,
      target_entity_id: wallet.id,
    });
    return result;
  }
  
  async accept(trustRelationshipId){
    const trustRelationship = await this.trustRepository.getById(trustRelationshipId);
    trustRelationship.state = TrustRepository.ENTITY_TRUST_STATE_TYPE.trusted;
    await this.trustRepository.update(trustRelationship);
  }
}

module.exports = TrustModel;
