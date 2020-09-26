const WalletRepository = require("../repositories/WalletRepository");
const HttpError = require("../utils/HttpError");
const Crypto = require('crypto');


class WalletModel{

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
    const hash = WalletModel.sha512(password, walletObject.salt);

    if (hash !== walletObject.password) {
      throw new HttpError(401, 'Invalid credentials');
    }
    return {
      id: walletObject.id,
    }


//  // Now check for wallet/password
//  const query2 = {
//    text: `SELECT *
//    FROM wallet
//    WHERE name = $1
//    AND password IS NOT NULL`,
//    values: [wallet],
//  };
//  // console.log(query2);
//  const rval2 = await pool.query(query2);
//
//  if (rval2.rows.length === 0) {
//    console.log('ERROR: Authentication, invalid credentials');
//    next({
//      log: 'Error: Invalid credentials',
//      status: 401,
//      message: { err: 'Error: Invalid credentials' },
//    });
//  }
//
//  const wallets = rval2.rows[0];
//  const hash = sha512(password, wallets.salt);
//
//  if (hash !== wallets.password) {
//    console.log('ERROR: Authentication, invalid credentials.');
//    next({
//      log: 'Error: Invalid credentials',
//      status: 401,
//      message: { err: 'Error: Invalid credentials' },
//    });
//  }
//  const payload = {
//    id: wallets.id,
//  };
  }
}

WalletModel.sha512 = (password, salt) => {
  const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  const value = hash.digest('hex');
  return value;
};

module.exports = WalletModel;
