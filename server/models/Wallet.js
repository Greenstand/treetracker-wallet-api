const WalletRepository = require("../repositories/WalletRepository");
const TrustRepository = require("../repositories/TrustRepository");
const HttpError = require("../utils/HttpError");
const Crypto = require('crypto');
const expect = require("expect-runtime");
const log = require("loglevel");
log.setLevel("debug");

class Wallet{

  constructor(id){
    expect(id).number();
    this._id = id;
    const WalletService = require("../services/WalletService");
    this.walletRepository = new WalletRepository();
    this.trustRepository = new TrustRepository();
    this.walletService = new WalletService();
  }

  getId(){
    return this._id;
  }

  async authorize(password){
    if(!password){
      throw new HttpError(400, 'Error: Invalid credential format');
    }

    let walletObject = await this.toJSON();
    const hash = Wallet.sha512(password, walletObject.salt);

    if (hash !== walletObject.password) {
      throw new HttpError(401, 'Invalid credentials');
    }
    return {
      id: walletObject.id,
    }
  }

  async getTrustRelationships(){
    return await this.trustRepository.get();
  }

  async toJSON(){
    return await this.walletRepository.getById(this._id);
  }

  /*
   * send a trust request to another wallet
   */
  async requestTrustFromAWallet(requestType, targetWalletName){
    log.debug("request trust...");
    expect(
      requestType, 
      () => new HttpError(400, `The trust request type must be one of ${Object.keys(TrustRepository.ENTITY_TRUST_REQUEST_TYPE).join(',')}`)
    )
      .oneOf(Object.keys(TrustRepository.ENTITY_TRUST_REQUEST_TYPE));
    expect(targetWalletName, () => new HttpError(400, "Invalid wallet name"))
      .match(/\S+/);

    const targetWallet = await this.walletService.getByName(targetWalletName);

    //check if I (current wallet) can add a new trust like this
    const trustRelationships = await this.getTrustRelationships();
    if(trustRelationships.some(trustRelationship => {
      expect(trustRelationship).property("type").defined();
      expect(trustRelationship).property("target_entity_id").number();
      return (
        trustRelationship.type === requestType &&
        trustRelationship.target_entity_id === targetWallet.getId()
      )
    })){
      throw new HttpError(403, "The trust requested has existed");
    }
    
    //check if the target wallet can accept the request
    await targetWallet.checkTrustRequestSentToMe(requestType, this.id);

    //create this request
    const result = await this.trustRepository.create({
      request_type: requestType,
      actor_entity_id: this.getId(),
      target_entity_id: targetWallet.getId(),
    });
    return result;
  }
  
  /*
   * Check if a request sent to me is acceptable.
   *
   * Params:
   *  requestType: trust type,
   *  sourceWalletId: the wallet id related to the trust relationship with me,
   */
  async checkTrustRequestSentToMe(requestType, sourceWalletId){
    //pass
  }
  
  async accept(trustRelationshipId){
    const trustRelationship = await this.trustRepository.getById(trustRelationshipId);
    trustRelationship.state = TrustRepository.ENTITY_TRUST_STATE_TYPE.trusted;
    await this.trustRepository.update(trustRelationship);
  }
}

Wallet.sha512 = (password, salt) => {
  const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  const value = hash.digest('hex');
  return value;
};


module.exports = Wallet;
