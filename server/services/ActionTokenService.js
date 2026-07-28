const JWTTools = require('jsonwebtoken');
const HttpError = require('../utils/HttpError');

const TransferService = require('./TransferService');
const WalletService = require('./WalletService');
const TokenService = require('./TokenService');
const Session = require('../infra/database/Session');



// PRIVATE and PUBLIC key
const privateKEY = process.env.PRIVATE_KEY.replace(/\\n/g, '\n'); // FS.readFileSync(path.resolve(__dirname, '../../config/jwtRS256.key'), 'utf8');
const publicKEY = process.env.PUBLIC_KEY.replace(/\\n/g, '\n'); // FS.readFileSync(path.resolve(__dirname, '../../config/jwtRS256.key.pub'), 'utf8');

const signingOptions = {
  issuer: 'greenstand',
  algorithm: 'RS256',
};

const verifyOptions = {
  issuer: 'greenstand',
  expiresIn: '7d',
  algorithms: ['RS256'],
};

class ActionTokenService {

  constructor() {
    this._transferService = new TransferService();
    this._walletService = new WalletService();
    this._tokenService = new TokenService();
    this._session = new Session();
  }
  
  async generate( email_id,wallet_id,limit) {
    const sender_wallet =  await this._walletService.getById(
      wallet_id
    );

    const tokens = await this._tokenService.getTokens({
      sender_wallet,
      limit,
      walletLoginId: wallet_id,
    });
    // get token ids of all the tokens 
    const token_ids= tokens.map((token)=> token.id )
    
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const expiration = now + (7 * 24 * 60 * 60);
    
    const payload = {
      sub: email_id,
      typ:'send-token',
      send_wallet:sender_wallet.name,
      token_ids,
      token_count:token_ids.length ,
      exp: expiration,
    }
    return JWTTools.sign(payload, privateKEY, signingOptions);
  };

 static async verify(token) {
  if (!token) {
    throw new HttpError(401, 'ERROR: no actionToken supplied ');
  }

  try{
    const result = await JWTTools.verify(token, publicKEY, verifyOptions);
 
    if (result.typ !== 'send-token') {
      throw new HttpError(401, 'ERROR: AccessToken, invalid token received');
    }

    return result;
  }catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new HttpError(401, 'ERROR: ActionToken expired');
      }
     throw new HttpError(401, 'ERROR: ActionToken not verified');
    
  }
}

async transferTokens( tokens,wallet_id ){
  try{
    await this._session.beginTransaction();
    const sender_wallet = await this._walletService.getByName(
      tokens.send_wallet
    );
    const receiver_wallet = await this._walletService.getById(
      wallet_id
    );
    
    const {result,status} = await this._transferService.initiateTransfer( {
      tokens:tokens.token_ids,
      sender_wallet:sender_wallet.name ,
      receiver_wallet:receiver_wallet.name 
     },
     wallet_id,
    );
    
    if( status !== 202 ){ 
      throw new HttpError(500,'Error Initialing Transfer')
    }

    const finalresult = await this._transferService.fulfillTransfer(
      sender_wallet.id, 
      result.id , 
      {implicit:true}
    );

    await this._session.commitTransaction();
    return finalresult;

  }catch (e) {
      if (this._session.isTransactionInProgress()) {
        await this._session.rollbackTransaction();
      }
      throw e;
    }
  }
}

module.exports = ActionTokenService;
