const log = require("loglevel");
const TokenRepository = require("../repositories/TokenRepository");
const expect = require("expect-runtime");

class Token{
  
  constructor(id){
    this._id = id;
    this.tokenRepository = new TokenRepository();
  }

//  async getByUUID(uuid){
//    return await this.tokenRepository.getByUUID(uuid);
//  }
  async toJSON(){
    const token = await this.tokenRepository.getById(this._id);
    return token;
  }
}

module.exports = Token;
