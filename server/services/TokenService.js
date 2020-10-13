const Token = require("../models/Token");
const TokenRepository = require("../repositories/TokenRepository");

class TokenService{

  constructor(){
    this.tokenRepository = new TokenRepository();
  }

  async getByUUID(uuid){
    const tokenObject = await this.tokenRepository.getByUUID(uuid);
    const token = new Token(tokenObject.id);
    return token;
  }

}

module.exports = TokenService;
