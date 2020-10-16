const WalletService = require("./WalletService");
const expect = require("expect-runtime");

class TrustService{

  constructor(){
    this.walletService = new WalletService();
  }

  async convertToResponse(trustObject){
    const {
      actor_entity_id,
      target_entity_id,
      originator_entity_id,
    } = trustObject;
    const result = {...trustObject};
    {
      const wallet = await this.walletService.getById(originator_entity_id);
      const json = await wallet.toJSON();
      result.originating_wallet = json.name;
      delete result.originator_entity_id;
    }
    {
      const wallet = await this.walletService.getById(actor_entity_id);
      const json = await wallet.toJSON();
      result.actor_wallet = await json.name;
      delete result.actor_entity_id;
    }
    {
      const wallet = await this.walletService.getById(target_entity_id);
      const json = await wallet.toJSON();
      result.target_wallet = await json.name;
      delete result.target_entity_id;
    }
    delete result.active;
    return result;
  }
}

module.exports = TrustService;
