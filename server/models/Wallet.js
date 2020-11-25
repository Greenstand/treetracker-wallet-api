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

  constructor(idOrJSON, session){
    if(typeof idOrJSON === "number"){
      this._id = idOrJSON;
    }else if(typeof idOrJSON === "object" && typeof idOrJSON.id === "number"){
      this._id = idOrJSON.id;
      this._JSON = idOrJSON;
    }else{
      throw new HttpError(500);
    }
    const WalletService = require("../services/WalletService");
    this.walletRepository = new WalletRepository(session);
    this.trustRepository = new TrustRepository(session);
    this.walletService = new WalletService(session);
    this.transferRepository = new TransferRepository(session);
    const TokenService = require("../services/TokenService");
    this.tokenService = new TokenService(session);
    this._session = session;
  }

  getId(){
    return this._id;
  }

  async authorize(password){
    if(!password){
      throw new HttpError(400, 'No password supplied');
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

  async addManagedWallet(wallet){
    if(!wallet){
      throw new HttpError(400, 'No wallet supplied');
    }

    // TO DO: check if wallet is expected format type?

    // TO DO: Need to check account permissions -> manage accounts
    // need to create a wallet object
    const newWallet = await this.walletRepository.create({
      name: wallet
    });

    // Is this how to check if db action was successful?
    if (!newWallet) {
      throw new HttpError(403, "The wallet already exists");
    }

    const newTrustRelationship = await this.trustRepository.create({
      actor_entity_id: this._id,
      originator_entity_id: this._id,
      target_entity_id: newWallet.id,
      request_type: TrustRelationship.ENTITY_TRUST_TYPE.manage,
      type: TrustRelationship.ENTITY_TRUST_TYPE.manage,
      state: TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
    });

    const managedWallet = await this.walletRepository.getById(newWallet.id);

    return managedWallet;
  }

  /*
   * Get trust relationships by filters, setting filter to undefined to allow all data
   */
  async getTrustRelationships(state, type, request_type){
    const filter = {
      and: [],
    }
    if(state){
      filter.and.push({state});
    }
    if(type){
      filter.and.push({type});
    }
    if(request_type){
      filter.and.push({request_type});
    }
    filter.and.push({
      or: [{
        actor_entity_id: this._id,
      },{
        target_entity_id: this._id,
      },{
        originator_entity_id: this._id,
      }]
    });
    return await this.trustRepository.getByFilter(filter);
  }

  /*
   * Get all the trust relationships I have requested
   */
  async getTrustRelationshipsRequested(){
    const result = await this.getTrustRelationships();
    return result.filter(trustRelationship => {
      return trustRelationship.originator_entity_id === this._id
    });
  }

  /*
   * Get all the trust relationships request to me
   */
  async getTrustRelationshipsRequestedToMe(){
    const result = await this.getTrustRelationships();
    return result.filter(trustRelationship => {
      if(
        trustRelationship.request_type === TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send ||
        trustRelationship.request_type === TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.manage
      ){
        return trustRelationship.target_entity_id === this._id
      }else if(
        trustRelationship.request_type === TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive ||
        trustRelationship.request_type === TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.yield
      ){
        return trustRelationship.actor_entity_id === this._id
      }else{
        throw new Error("not support yet");
      }
    });
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
    const result = await this.getTrustRelationships();
    return result.filter(trustRelationship => {
      return trustRelationship.state === TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted
    });
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
  async requestTrustFromAWallet(
    requestType, 
    requesterWallet,
    requesteeWallet,
  ){
    log.debug("request trust...");
    expect(
      requestType, 
      () => new HttpError(400, `The trust request type must be one of ${Object.keys(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE).join(',')}`)
    )
      .oneOf(Object.keys(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE));

    /*
     * Translate the requester/ee to actor/target
     */
    let actorWallet = requesterWallet; //case of: manage/send
    let targetWallet = requesteeWallet; //case of: mange/send
    if(
      requestType === TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive ||
      requestType === TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.yield){
      actorWallet = requesteeWallet;
      targetWallet = requesterWallet;
    }


    //check if I (current wallet) can add a new trust like this
    const trustRelationships = await this.getTrustRelationships();
    if(trustRelationships.some(trustRelationship => {
      expect(trustRelationship).property("type").defined();
      expect(trustRelationship).property("target_entity_id").number();
      return (
        trustRelationship.type === TrustRelationship.ENTITY_TRUST_TYPE.send &&
        trustRelationship.request_type === requestType &&
        trustRelationship.target_entity_id === targetWallet.getId() &&
        trustRelationship.originator_entity_id === this._id &&
        trustRelationship.actor_entity_id === actorWallet._id
      )
    })){
      throw new HttpError(403, "The trust requested has existed");
    }
    
    //check if the orginator can control the actor
    const hasControl = await this.hasControlOver(requesterWallet);
    if(!hasControl){
      throw new HttpError(403, "Have no permission to deal with this actor");
    }
    
    //check if the target wallet can accept the request
    await requesteeWallet.checkTrustRequestSentToMe(requestType, this.id);

    //create this request
    const result = await this.trustRepository.create({
      type: TrustRelationship.getTrustTypeByRequestType(requestType),
      request_type: requestType,
      actor_entity_id: actorWallet.getId(),
      originator_entity_id: this._id,
      target_entity_id: targetWallet.getId(),
      state: TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested,
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
    const trustRelationships = await this.getTrustRelationshipsRequestedToMe(this._id);
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
    const json = await this.trustRepository.update(trustRelationship);
    return json;
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
    const json = await this.trustRepository.update(trustRelationship);
    return json;
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
    const json = await this.trustRepository.update(trustRelationship);
    return json;
  }

  /*
   * To check if the indicated trust relationship exist between the source and 
   * target wallet
   */
  async checkTrust(trustType, senderWallet, receiveWallet){
    expect(trustType).oneOf(Object.keys(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE));
    expect(senderWallet).instanceOf(Wallet);
    expect(receiveWallet).instanceOf(Wallet);
    const trustRelationships = await this.getTrustRelationshipsTrusted();
    //check if the trust exist
    if(
      trustRelationships.some(trustRelationship => {
        expect(trustRelationship).match({
          actor_entity_id: expect.any(Number),
          target_entity_id: expect.any(Number),
          request_type: expect.any(String),
          type: expect.any(String),
        });
        if(
          trustRelationship.actor_entity_id === senderWallet.getId() &&
          trustRelationship.target_entity_id === receiveWallet.getId() &&
          trustRelationship.request_type === TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send
        ){
          return true;
        }else{
          return false;
        }
      })
      ||
      trustRelationships.some(trustRelationship => {
        expect(trustRelationship).match({
          actor_entity_id: expect.any(Number),
          target_entity_id: expect.any(Number),
          request_type: expect.any(String),
          type: expect.any(String),
        });
        if(
          trustRelationship.actor_entity_id === receiveWallet.getId() &&
          trustRelationship.target_entity_id === senderWallet.getId() &&
          trustRelationship.request_type === TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive
        ){
          return true;
        }else{
          return false;
        }
      })
    ){
      log.debug("check trust passed");
    }else{
      throw new HttpError(403, "Have no permission to do this action");
    }
  }

  /*
   * Transfer some tokens from the sender to receiver
   */
  async transfer(sender, receiver, tokens){
    await this.checkDeduct(sender, receiver);
    //check tokens belong to sender
    for(const token of tokens){
      if(!await token.belongsTo(sender)){
        throw new HttpError(403, `The token ${token.toJSON().uuid} do not belongs to sender wallet`);
      }
    }

    try{
      await this.checkTrust(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send, sender, receiver);   
      const tokensUUID = [];
      for(let token of tokens){
        const json = await token.toJSON();
        tokensUUID.push(json.uuid);
      }
      const transfer = await this.transferRepository.create({
        originator_entity_id: this._id, 
        source_entity_id: sender.getId(),
        destination_entity_id: receiver.getId(),
        state: Transfer.STATE.completed,
        parameters: {
          tokens: tokensUUID,
        },
      });
      log.debug("now, deal with tokens");
      for(let token of tokens){
        await token.completeTransfer(transfer);
      }
      return transfer;
      
    }catch(e){
      //haven't trust
      if(e instanceof HttpError && e.code === 403){
        if(await this.hasControlOver(sender)){
          log.debug("OK, no permission, source under control, now pending it");
          const tokensUUID = [];
          for(let token of tokens){
            const json = await token.toJSON();
            tokensUUID.push(json.uuid);
          }
          const transfer = await this.transferRepository.create({
            originator_entity_id: this._id, 
            source_entity_id: sender.getId(),
            destination_entity_id: receiver.getId(),
            state: Transfer.STATE.pending,
            parameters: {
              tokens: tokensUUID,
            },
          });
          for(let token of tokens){
            await token.pendingTransfer(transfer);
          }
          return transfer;
        }else if(await this.hasControlOver(receiver)){
          log.debug("OK, no permission, receiver under control, now request it");
          const tokensUUID = [];
          for(let token of tokens){
            const json = await token.toJSON();
            tokensUUID.push(json.uuid);
          }
          const transfer = await this.transferRepository.create({
            originator_entity_id: this._id, 
            source_entity_id: sender.getId(),
            destination_entity_id: receiver.getId(),
            state: Transfer.STATE.requested,
            parameters: {
              tokens: tokensUUID,
            },
          });
          for(let token of tokens){
            await token.pendingTransfer(transfer);
          }
          return transfer;
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
        parameters: {
          bundle: {
            bundleSize: bundleSize,
          }
        }
      });
      log.debug("now, deal with tokens");
      const tokens = await this.tokenService.getTokensByBundle(sender, bundleSize)
      for(let token of tokens){
        await token.completeTransfer(transfer);
      }
      return transfer;
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
          return transfer;
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
          return transfer;
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
      const result = await this.trustRepository.getByFilter({
        actor_entity_id: this._id,
        target_entity_id: wallet.getId(),
        type: TrustRelationship.ENTITY_TRUST_TYPE.manage,
        state: TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
      });
      if(result.length > 0){
        return true;
      }else{
        return false;
      }
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

    const transfer = await this.transferRepository.getById(transferId);
    const receiver = await this.walletService.getById(transfer.destination_entity_id);
    const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(receiver);
    if(!doseCurrentAccountHasControlOverReceiver){
      throw new HttpError(403, "Current account has no permission to accept this transfer");
    }

    transfer.state = Transfer.STATE.completed;
    const transferJson = await this.transferRepository.update(transfer);

    //deal with tokens
    if(
      //TODO optimize
      transfer.parameters &&
      transfer.parameters.bundle &&
      transfer.parameters.bundle.bundleSize){
      log.debug("transfer bundle of tokens");
      const {source_entity_id} = transfer;
      expect(source_entity_id).number();
      const senderWallet = new Wallet(source_entity_id, this._session);
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
    return transferJson;
  }

  /*
   * Decline a pending transfer, if I has the privilege to do so
   */
  async declineTransfer(transferId){
    const transfer = await this.transferRepository.getById(transferId);
    const receiver = await this.walletService.getById(transfer.destination_entity_id);
    const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(receiver);
    if(!doseCurrentAccountHasControlOverReceiver){
      throw new HttpError(403, "Current account has no permission to decline this transfer");
    }
    transfer.state = Transfer.STATE.cancelled;
    const transferJson = await this.transferRepository.update(transfer);

    //deal with tokens
    const tokens = await this.tokenService.getTokensByPendingTransferId(transfer.id);
    for(let token of tokens){
      await token.cancelTransfer(transfer);
    }
    return transferJson;
  }

  async cancelTransfer(transferId){
    const transfer = await this.transferRepository.getById(transferId);
    const sender = await this.walletService.getById(transfer.source_entity_id);
    const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(sender);
    if(!doseCurrentAccountHasControlOverReceiver){
      throw new HttpError(403, "Current account has no permission to cancel this transfer");
    }
    transfer.state = Transfer.STATE.cancelled;
    const transferJson = await this.transferRepository.update(transfer);

    //deal with tokens
    const tokens = await this.tokenService.getTokensByPendingTransferId(transfer.id);
    for(let token of tokens){
      await token.cancelTransfer(transfer);
    }
    return transferJson;
  }

  /*
   * Fulfill a requested transfer, if I has the privilege to do so
   */
  async fulfillTransfer(transferId){
    //TODO check privilege

    const transfer = await this.transferRepository.getById(transferId);
    const sender = await this.walletService.getById(transfer.source_entity_id);
    const doseCurrentAccountHasControlOverReceiver = await this.hasControlOver(sender);
    if(!doseCurrentAccountHasControlOverReceiver){
      throw new HttpError(403, "Current account has no permission to fulfill this transfer");
    }
    if(transfer.source_entity_id !== this._id){
      throw new HttpError(403, "Have no permission to do this operation");
    }
    if(transfer.state !== Transfer.STATE.requested){
      throw new HttpError(403, "Operation forbidden, the transfer state is wrong");
    }
    transfer.state = Transfer.STATE.completed;
    const transferJson = await this.transferRepository.update(transfer);

    //deal with tokens
    if(
      //TODO optimize
      transfer.parameters &&
      transfer.parameters.bundle &&
      transfer.parameters.bundle.bundleSize){
      log.debug("transfer bundle of tokens");
      const {source_entity_id} = transfer;
      expect(source_entity_id).number();
      const senderWallet = new Wallet(source_entity_id, this._session);
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
    return transferJson;
  }

  /*
   * Get all transfers belongs to me
   */
  async getTransfers(state, wallet){
    const filter = {
      and: [],
    }
    filter.and.push({
      or: [{
        source_entity_id: this._id,
      },{
        destination_entity_id: this._id,
      },{
        originator_entity_id: this._id,
      }]
    });
    if(state){
      filter.and.push({state});
    }
    if(wallet){
      filter.and.push({
        or: [{
          source_entity_id: wallet.getId(),
        },{
          destination_entity_id: wallet.getId(),
        },{
          originator_entity_id: wallet.getId(),
        }]
      });
    }
    const result = await this.transferRepository.getByFilter(filter);
    return result;
  }

  /*
   * Check if it is deduct, if ture, throw 403, cuz we do not support it yet
   */
  async checkDeduct(sender, receiver){
    if(this._id === sender.getId()){
      return;
    }
    const result = await this.hasControlOver(sender);
    if(result){
      return;
    }else{
      throw new HttpError(403, "Do not support deduct yet");
    }
  }

  /*
   * Get all wallet managed by me
   */
  async getSubWallets(){
    let trustRelationships = await this.getTrustRelationships();
    trustRelationships = trustRelationships.filter(e => {
      // where logged in wallet is the actor wallet
      if(e.actor_entity_id === this._id &&
        e.type === TrustRelationship.ENTITY_TRUST_TYPE.manage &&
        e.state === TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted
      ){
        return true;
      }else{
        return false;
      }
    });
    const subWallets = [];
    // include logged in wallet in response 
    subWallets.push(this);

    for(let e of trustRelationships){
      const subWallet = await this.walletService.getById(e.target_entity_id);
      subWallets.push(subWallet);
    }
    return subWallets;
  }
}

Wallet.sha512 = (password, salt) => {
  const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  const value = hash.digest('hex');
  return value;
};


module.exports = Wallet;
