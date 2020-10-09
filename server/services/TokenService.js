const Token = require("../models/Token");
const TokenRepository = require("../repositories/TokenRepository");
const expect = require("expect-runtime");

class TokenService{

  constructor(){
    this.tokenRepository = new TokenRepository();
  }

  async getByUUID(uuid){
    const tokenObject = await this.tokenRepository.getByUUID(uuid);
    const token = new Token(tokenObject);
    return token;
  }

  async getTokensByPendingTransferId(transferId){
    expect(transferId).number();
    const result = await this.tokenRepository.getByFilter({
      transfer_pending_id: transferId,
    });
    return result.map(object => {
      return new Token(object);
    });
  }

  async getTokensByBundle(wallet){
  }

  async countTokenByWallet(wallet){
  }

}

module.exports = TokenService;
