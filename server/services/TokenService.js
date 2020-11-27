const Token = require("../models/Token");
const TokenRepository = require("../repositories/TokenRepository");
const expect = require("expect-runtime");

class TokenService{

  constructor(session){
    this._session =  session
    this.tokenRepository = new TokenRepository(session);
    const WalletService  = require("../services/WalletService");
    this.walletService = new WalletService(session);
  }

  async getByUUID(uuid){
    const tokenObject = await this.tokenRepository.getByUUID(uuid);
    const token = new Token(tokenObject, this._session);
    return token;
  }

  async getById(id){
    const tokenObject = await this.tokenRepository.getById(id);
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
      return new Token(object, this._session);
    });
  }

  /*
   * Get n tokens from a wallet
   */
  async getTokensByBundle(wallet, bundleSize){
    const result = await this.tokenRepository.getByFilter({
      entity_id: wallet.getId(),
      transfer_pending: false,
    },{
      limit: bundleSize,
    });
    return result.map(json => new Token(json, this._session));
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

  async convertToResponse(transactionObject){
    expect(transactionObject).match({
      token_id: expect.any(Number),
      source_entity_id: expect.any(Number),
      destination_entity_id: expect.any(Number),
    });
    const {
      token_id,
      source_entity_id,
      destination_entity_id,
      processed_at,
    } = transactionObject;
    const result = {
      processed_at,
    };
    {
      const token = await this.getById(token_id);
      const json = await token.toJSON();
      result.token = json.uuid;
    }
    {
      const wallet = await this.walletService.getById(source_entity_id);
      const json = await wallet.toJSON();
      result.sender_wallet = await json.name;
    }
    {
      const wallet = await this.walletService.getById(destination_entity_id);
      const json = await wallet.toJSON();
      result.receiver_wallet = await json.name;
    }
    return result;
  }

}

module.exports = TokenService;
