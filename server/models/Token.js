const log = require("loglevel");
const TokenRepository = require("../repositories/TokenRepository");

class Token{
  
  constructor(){
    this.tokenRepository = new TokenRepository();
  }

  async getByUUID(uuid){
    return await this.tokenRepository.getByUUID(uuid);
  }
}

module.exports = Token;
