const WalletRepository = require("../repositories/WalletRepository");
const HttpError = require("../utils/HttpError");
const Crypto = require('crypto');


class Wallet{

  constructor(){
    this.walletRepository = new WalletRepository();
  }

  async authorize(wallet, password){
    if(!wallet || !password){
      throw new HttpError(400, 'Error: Invalid credential format');
    }

    let walletObject;
    try{
      walletObject = await this.walletRepository.getByName(wallet);
    }catch(e){
      if(e.code === 404){
        //404 -> 401
        throw new HttpError(401, 'Authentication, invalid credentials');
      }else{
        throw e;
      }
    }
    const hash = Wallet.sha512(password, walletObject.salt);

    if (hash !== walletObject.password) {
      throw new HttpError(401, 'Invalid credentials');
    }
    return {
      id: walletObject.id,
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
