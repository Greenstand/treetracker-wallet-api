const WalletService = require("./WalletService");
const expect = require("expect-runtime");

class TransferService{

  constructor(){
    this.walletService = new WalletService();
  }

  async convertToResponse(transferObject){
    expect(transferObject).match({
      originator_entity_id: expect.any(Number),
      source_entity_id: expect.any(Number),
      destination_entity_id: expect.any(Number),
    });
    const {
      originator_entity_id,
      source_entity_id,
      destination_entity_id
    } = transferObject;
    const result = {...transferObject};
    {
      const wallet = await this.walletService.getById(originator_entity_id);
      const json = await wallet.toJSON();
      result.originating_wallet = json.name;
      delete result.originator_entity_id;
    }
    {
      const wallet = await this.walletService.getById(source_entity_id);
      const json = await wallet.toJSON();
      result.source_wallet = await json.name;
      delete result.source_entity_id;
    }
    {
      const wallet = await this.walletService.getById(destination_entity_id);
      const json = await wallet.toJSON();
      result.destination_wallet = await json.name;
      delete result.destination_entity_id;
    }
    return result;
  }

}

module.exports = TransferService;
