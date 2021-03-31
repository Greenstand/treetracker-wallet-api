const Token = require("../models/Token");
const TokenRepository = require("../repositories/TokenRepository");
const TransactionRepository = require("../repositories/TransactionRepository");
const log = require("loglevel");
const Joi = require("joi");

class TokenService{

  constructor(session){
    this._session =  session
    this.tokenRepository = new TokenRepository(session);
    this.transactionRepository = new TransactionRepository(session);
    const WalletService  = require("../services/WalletService");
    this.walletService = new WalletService(session);
  }

  async getById(id){
    const tokenObject = await this.tokenRepository.getById(id);
    const token = new Token(tokenObject, this._session);
    return token;
  }

  async getByOwner(wallet, limit, offset){
    const tokensObject = await this.tokenRepository.getByFilter({
      wallet_id: wallet.getId(),
    }, {limit, offset});
    return tokensObject.map(object => new Token(object, this._session));
  }

  async getTokensByPendingTransferId(transferId, limit, offset = 0){
    const result = await this.tokenRepository.getByFilter({
      transfer_pending_id: transferId,
    }, {limit, offset});
    return result.map(object => {
      return new Token(object, this._session);
    });
  }

  /*
   * Get n tokens from a wallet
   */
  async getTokensByBundle(wallet, bundleSize){
    const result = await this.tokenRepository.getByFilter({
      wallet_id: wallet.getId(),
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
      wallet_id: wallet.getId(),
    });
    return result;
  }

  async convertToResponse(transactionObject){
    const {
      token_id,
      source_wallet_id,
      destination_wallet_id,
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
      const wallet = await this.walletService.getById(source_wallet_id);
      const json = await wallet.toJSON();
      result.sender_wallet = await json.name;
    }
    {
      const wallet = await this.walletService.getById(destination_wallet_id);
      const json = await wallet.toJSON();
      result.receiver_wallet = await json.name;
    }
    return result;
  }

  async getTokensByTransferId(transferId, limit, offset = 0){
    const result = await this.tokenRepository.getByTransferId(transferId, limit, offset);
    const tokens = [];
    for(const r of result){
      const token = new Token(r);
      tokens.push(token);
    }
    return tokens;
  }

  /*
   * To replace token.completeTransfer, as a bulk operaction
   */
  async completeTransfer(tokens, transfer){
    log.debug("Token complete transfer batch");
    await this.tokenRepository.updateByIds({
        transfer_pending: false,
        transfer_pending_id: null,
        wallet_id: transfer.destination_wallet_id,
      },
      tokens.map(token => token.getId()),
    );
    await this.transactionRepository.batchCreate(tokens.map(token => ({
      token_id: token.getId(),
      transfer_id: transfer.id,
      source_wallet_id: transfer.source_wallet_id,
      destination_wallet_id: transfer.destination_wallet_id,
    })));
  }

  /*
   * Batch operaction to pending transfer
   */
  async pendingTransfer(tokens, transfer){
    Joi.assert(
      transfer.id,
      Joi.string().guid()
    )

    await this.tokenRepository.updateByIds({
      transfer_pending: true,
      transfer_pending_id: transfer.id,
    }, 
    tokens.map(token => token.getId()),
    );
  }

  /*
   * Batch way to cancel transfer
   */
  async cancelTransfer(tokens, transfer){
    log.debug("Token cancel transfer");
    await this.tokenRepository.updateByIds({
        transfer_pending: false,
        transfer_pending_id: null
      },
      tokens.map(token => token.getId()),
    );
  }

}

module.exports = TokenService;
