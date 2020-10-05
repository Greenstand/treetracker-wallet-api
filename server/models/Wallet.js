const WalletRepository = require("../repositories/WalletRepository");
const TrustRepository = require("../repositories/TrustRepository");
const TrustRelationship = require("../models/TrustRelationship");
const HttpError = require("../utils/HttpError");
const Crypto = require('crypto');
const expect = require("expect-runtime");
const log = require("loglevel");

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

  /*
   * Get all the trust relationships I have requested
   */
  async getTrustRelationshipsRequested(){
    return await this.trustRepository.getByOriginatorId(this._id);
  }

  /*
   * Get all the trust relationships targeted to me, means request
   * the trust from me
   */
  async getTrustRelationshipsTargeted(){
    return await this.trustRepository.getByTargetId(this._id);
  }

  /*
   * Get all relationships which has been accepted
   */
  async getTrustRelationshipsTrusted(){
    return await this.trustRepository.getTrustedByOriginatorId(this._id);
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
      () => new HttpError(400, `The trust request type must be one of ${Object.keys(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE).join(',')}`)
    )
      .oneOf(Object.keys(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE));
    expect(targetWalletName, () => new HttpError(400, "Invalid wallet name"))
      .match(/\S+/);

    const targetWallet = await this.walletService.getByName(targetWalletName);

    //check if I (current wallet) can add a new trust like this
    const trustRelationships = await this.getTrustRelationshipsRequested();
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
      actor_entity_id: this._id,
      originator_entity_id: this._id,
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
  
  async acceptTrustRequestSentToMe(trustRelationshipId){
    expect(trustRelationshipId).number();
    const trustRelationships = await this.getTrustRelationshipsTargeted(this._id);
    const trustRelationship = trustRelationships.reduce((a,c) => {
      expect(c.id).number();
      if(c.id === trustRelationshipId){
        return c;
      }else{
        return a;
      }
    }, undefined);
    if(!trustRelationship){
      throw new HttpError(403, "Have no permission to accept this relationship");
    }
    trustRelationship.state = TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted;
    await this.trustRepository.update(trustRelationship);
  }

  /*
   * To check if the indicated trust relationship exist between the source and 
   * target wallet
   */
  async checkTrust(trustType, sourceWallet, targetWallet){
    expect(trustType).oneOf(Object.keys(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE));
    expect(sourceWallet).instanceOf(Wallet);
    expect(targetWallet).instanceOf(Wallet);
    const trustRelationships = await this.getTrustRelationshipsTrusted();
    //check if the trust exist
    if(trustRelationships.some(trustRelationship => {
      expect(trustRelationship).match({
        actor_entity_id: expect.any(Number),
        target_entity_id: expect.any(Number),
        request_type: expect.any(String),
      });
      if(
        trustRelationship.actor_entity_id === sourceWallet.getId() &&
        trustRelationship.target_entity_id === targetWallet.getId() &&
        trustRelationship.request_type === trustType
      ){
        return true;
      }else{
        return false;
      }
    })){
      log.debug("check trust passed");
    }else{
      throw new HttpError(403, "Have no permission to do this action");
    }
  }

}

Wallet.sha512 = (password, salt) => {
  const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  const value = hash.digest('hex');
  return value;
};


module.exports = Wallet;
