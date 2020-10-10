const WalletRepository = require("../repositories/WalletRepository");
const TrustRepository = require("../repositories/TrustRepository");
const TrustRelationship = require("../models/TrustRelationship");
const TransferRepository = require("../repositories/TransferRepository");
const HttpError = require("../utils/HttpError");
const Crypto = require('crypto');
const expect = require("expect-runtime");
const log = require("loglevel");
const Transfer = require("./Transfer");
const Token = require("./Token");

class Wallet{

  constructor(idOrJSON){
    if(typeof idOrJSON === "number"){
      this._id = idOrJSON;
    }else if(typeof idOrJSON === "object" && typeof idOrJSON.id === "number"){
      this._id = idOrJSON.id;
      this._JSON = idOrJSON;
    }else{
      throw new HttpError(500);
    }
    const WalletService = require("../services/WalletService");
    this.walletRepository = new WalletRepository();
    this.trustRepository = new TrustRepository();
    this.walletService = new WalletService();
    this.transferRepository = new TransferRepository();
    const TokenService = require("../services/TokenService");
    this.tokenService = new TokenService();
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
    if(this._JSON){
      return this._JSON;
    }else{
      this._JSON = await this.walletRepository.getById(this._id);
      return this._JSON;
    }
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
  
  /*
   * Accept a trust relationship request
   */
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
   * Decline a trust relationship request
   */
  async declineTrustRequestSentToMe(trustRelationshipId){
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
      throw new HttpError(403, "Have no permission to decline this relationship");
    }
    trustRelationship.state = TrustRelationship.ENTITY_TRUST_STATE_TYPE.canceled_by_target;
    await this.trustRepository.update(trustRelationship);
  }

  /*
   * Cancel a trust relationship request
   */
  async cancelTrustRequestSentToMe(trustRelationshipId){
    expect(trustRelationshipId).number();
    const trustRelationship = await this.trustRepository.getById(trustRelationshipId);
    if(trustRelationship.originator_entity_id !== this._id){
      throw new HttpError(403, "Have no permission to cancel this relationship");
    }
    trustRelationship.state = TrustRelationship.ENTITY_TRUST_STATE_TYPE.cancelled_by_originator;
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

  /*
   * Transfer some tokens from the sender to receiver
   */
  async transfer(sender, receiver, tokens){
    //check tokens belong to sender
    for(const token of tokens){
      if(!await token.belongsTo(sender)){
        throw new HttpError(403, `The token ${token.toJSON().uuid} do not belongs to sender wallet`);
      }
    }

    try{
      await this.checkTrust(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send, sender, receiver);   
      const transfer = await this.transferRepository.create({
        originator_entity_id: this._id, 
        source_entity_id: sender.getId(),
        destination_entity_id: receiver.getId(),
        state: Transfer.STATE.completed,
      });
      log.debug("now, deal with tokens");
      for(let token of tokens){
        await token.completeTransfer(transfer);
      }
      
    }catch(e){
      //haven't trust
      if(e instanceof HttpError && e.code === 403){
        if(await this.hasControlOver(sender)){
          log.debug("OK, no permission, source under control, now pending it");
          const transfer = await this.transferRepository.create({
            originator_entity_id: this._id, 
            source_entity_id: sender.getId(),
            destination_entity_id: receiver.getId(),
            state: Transfer.STATE.pending,
          });
          for(let token of tokens){
            await token.pendingTransfer(transfer);
          }
          throw new HttpError(202, "No trust, saved");
        }else if(await this.hasControlOver(receiver)){
          log.debug("OK, no permission, receiver under control, now request it");
          const transfer = await this.transferRepository.create({
            originator_entity_id: this._id, 
            source_entity_id: sender.getId(),
            destination_entity_id: receiver.getId(),
            state: Transfer.STATE.requested,
          });
          for(let token of tokens){
            await token.pendingTransfer(transfer);
          }
          throw new HttpError(202, "No trust, saved");
        }else{
          //TODO
          expect.fail();
        }
      }else{
        throw e;
      }
    }
  }

  async transferBundle(sender, receiver, bundleSize){
    //check has enough tokens to sender
    const tokenCount = await this.tokenService.countTokenByWallet(sender);
    expect(tokenCount).number();
    if(tokenCount < bundleSize){
      throw new HttpError(403, `Do not have enough tokens to send`);
    }

    try{
      await this.checkTrust(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send, sender, receiver);   
      const transfer = await this.transferRepository.create({
        originator_entity_id: this._id, 
        source_entity_id: sender.getId(),
        destination_entity_id: receiver.getId(),
        state: Transfer.STATE.completed,
      });
      log.debug("now, deal with tokens");
      const tokens = await this.tokenService.getTokensByBundle(bundleSize)
      for(let token of tokens){
        await token.completeTransfer(transfer);
      }
      
    }catch(e){
      if(e instanceof HttpError && e.code === 403){
        if(await this.hasControlOver(sender)){
          log.debug("OK, no permission, source under control, now pending it");
          const transfer = await this.transferRepository.create({
            originator_entity_id: this._id, 
            source_entity_id: sender.getId(),
            destination_entity_id: receiver.getId(),
            state: Transfer.STATE.pending,
            parameters: {
              bundle: {
                bundleSize: bundleSize,
              }
            }
          });
          throw new HttpError(202, "No trust, saved");
        }else if(await this.hasControlOver(receiver)){
          log.debug("OK, no permission, receiver under control, now request it");
          const transfer = await this.transferRepository.create({
            originator_entity_id: this._id, 
            source_entity_id: sender.getId(),
            destination_entity_id: receiver.getId(),
            state: Transfer.STATE.requested,
            parameters: {
              bundle: {
                bundleSize: bundleSize,
              }
            }
          });
          throw new HttpError(202, "No trust, saved");
        }else{
          //TODO
          expect.fail();
        }
      }else{
        throw e;
      }
    }
  }

  /*
   * I have control over given wallet
   */
  async hasControlOver(wallet){
    //if the given wallet is me, then pass
    if(wallet.getId() === this._id){
      log.debug("The same wallet, control");
      return true;
    }else{
      //check sub wallet
      //TODO
      return false;
    }
  }

  /*
   * To get all the pending transfer sent to me
   */
  async getPendingTransfers(){
    const result = await this.transferRepository.getPendingTransfers(this._id);
    return result;
  }

  /*
   * Accept a pending transfer, if I has the privilege to do so
   */
  async acceptTransfer(transferId){
    //TODO check privilege

    const transfer = await this.transferRepository.getById(transferId);
    transfer.state = Transfer.STATE.completed;
    await this.transferRepository.update(transfer);

    //deal with tokens
    if(
      //TODO optimize
      transfer.parameters &&
      transfer.parameters.bundle &&
      transfer.parameters.bundle.bundleSize){
      log.debug("transfer bundle of tokens");
      const {source_entity_id} = transfer;
      expect(source_entity_id).number();
      const senderWallet = new Wallet(source_entity_id);
      const tokens = await this.tokenService.getTokensByBundle(senderWallet, transfer.parameters.bundle.bundleSize);
      for(let token of tokens){
        expect(token).defined();
        await token.completeTransfer(transfer);
      }
    }else{
      log.debug("transfer tokens");
      const tokens = await this.tokenService.getTokensByPendingTransferId(transfer.id);
      for(let token of tokens){
        await token.completeTransfer(transfer);
      }
    }
  }

  /*
   * Decline a pending transfer, if I has the privilege to do so
   */
  async declineTransfer(transferId){
    //TODO check privilege

    const transfer = await this.transferRepository.getById(transferId);
    transfer.state = Transfer.STATE.cancelled;
    await this.transferRepository.update(transfer);

    //deal with tokens
    const tokens = await this.tokenService.getTokensByPendingTransferId(transfer.id);
    for(let token of tokens){
      await token.cancelTransfer(transfer);
    }
  }

  async cancelTransfer(transferId){
    //TODO check privilege

    const transfer = await this.transferRepository.getById(transferId);
    transfer.state = Transfer.STATE.cancelled;
    await this.transferRepository.update(transfer);
  }

  /*
   * Fulfill a requested transfer, if I has the privilege to do so
   */
  async fulfillTransfer(transferId){
    //TODO check privilege

    const transfer = await this.transferRepository.getById(transferId);
    if(transfer.source_entity_id !== this._id){
      throw new HttpError(403, "Have no permission to do this operation");
    }
    if(transfer.state !== Transfer.STATE.requested){
      throw new HttpError(403, "Operation forbidden, the transfer state is wrong");
    }
    transfer.state = Transfer.STATE.completed;
    await this.transferRepository.update(transfer);
  }

  /*
   * Get all transfers belongs to me
   */
  async getTransfers(state, wallet){
    const filter = {
    };
    if(state){
      //TODO check the state parameter
      filter.state = state;
    }
    const result = await this.transferRepository.getByFilter(filter);
    return result;
  }
}

Wallet.sha512 = (password, salt) => {
  const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  const value = hash.digest('hex');
  return value;
};


module.exports = Wallet;
