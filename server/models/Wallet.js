const WalletRepository = require("../repositories/WalletRepository");
const TrustRepository = require("../repositories/TrustRepository");
const HttpError = require("../utils/HttpError");
const Crypto = require('crypto');
const expect = require("expect-runtime");


class Wallet{

  constructor(id){
    expect(id).number();
    this.id = id;
    this.walletRepository = new WalletRepository();
    this.trustRepository = new TrustRepository();
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
    return await this.walletRepository.getById(this.id);
  }

  async request(requestType, walletName){
    expect(requestType, () => new HttpError(400, `The trust request type must be one of ${Object.keys(TrustRepository.ENTITY_TRUST_REQUEST_TYPE).join(',')}`))
      .oneOf(Object.keys(TrustRepository.ENTITY_TRUST_REQUEST_TYPE));
    expect(walletName, () => new HttpError(400, "Invalid wallet name"))
      .match(/\S+/);
    
    //get wallet id
    const wallet = await this.walletRepository.getByName((walletName));
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

Wallet.sha512 = (password, salt) => {
  const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  const value = hash.digest('hex');
  return value;
};

module.exports = Wallet;
