const WalletRepository = require("../repositories/WalletRepository");
const HttpError = require("../utils/HttpError");
const Crypto = require('crypto');
const expect = require("expect-runtime");


class Wallet{

  constructor(id){
    expect(id).number();
    this.id = id;
    this.walletRepository = new WalletRepository();
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

  async toJSON(){
    return await this.walletRepository.getById(this.id);
  }
}

Wallet.sha512 = (password, salt) => {
  const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  const value = hash.digest('hex');
  return value;
};

module.exports = Wallet;
