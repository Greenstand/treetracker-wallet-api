const WalletService = require("./WalletService");
const expect = require("expect-runtime");
const Session = require("../models/Session");

class TrustService{

  constructor(){
    let session = new Session();
    this.walletService = new WalletService(session);
  }

  async convertToResponse(trustObject){
    const {
      actor_wallet_id,
      target_wallet_id,
      originator_wallet_id,
    } = trustObject;
    const result = {...trustObject};
    {
      const wallet = await this.walletService.getById(originator_wallet_id);
      const json = await wallet.toJSON();
      result.originating_wallet = json.name;
      delete result.originator_wallet_id;
    }
    {
      const wallet = await this.walletService.getById(actor_wallet_id);
      const json = await wallet.toJSON();
      result.actor_wallet = await json.name;
      delete result.actor_wallet_id;
    }
    {
      const wallet = await this.walletService.getById(target_wallet_id);
      const json = await wallet.toJSON();
      result.target_wallet = await json.name;
      delete result.target_wallet_id;
    }
    delete result.active;
    return result;
  }
}

module.exports = TrustService;
