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

  async getByOwner(wallet){
    const tokensObject = await this.tokenRepository.getByFilter({
      entity_id: wallet.getId(),
    });
    const tokens = tokensObject.map(object => new Token(object));
    return tokens;
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

  /*
   * Get n tokens from a wallet
   */
  async getTokensByBundle(wallet, bundleSize){
    const result = await this.tokenRepository.getByFilter({
      entity_id: wallet.getId(),
    },{
      limit: bundleSize,
    });
    return result.map(json => new Token(json));
  }

  /*
   * Count how many tokens a wallet has
   */
  async countTokenByWallet(wallet){
    const result = await this.tokenRepository.countByFilter({
      entity_id: wallet.getId(),
    });
    return result;
  }

}

module.exports = TokenService;
