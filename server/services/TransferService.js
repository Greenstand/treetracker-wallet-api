const WalletService = require("./WalletService");
const expect = require("expect-runtime");

class TransferService{

  constructor(session){
    this._session = session;
    this.walletService = new WalletService(session);
  }

  async convertToResponse(transferObject){
    expect(transferObject).match({
      originator_wallet_id: expect.any(Number),
      source_wallet_id: expect.any(Number),
      destination_wallet_id: expect.any(Number),
    });
    const {
      originator_wallet_id,
      source_wallet_id,
      destination_wallet_id
    } = transferObject;
    const result = {...transferObject};
    {
      const wallet = await this.walletService.getById(originator_wallet_id);
      const json = await wallet.toJSON();
      result.originating_wallet = json.name;
      delete result.originator_wallet_id;
    }
    {
      const wallet = await this.walletService.getById(source_wallet_id);
      const json = await wallet.toJSON();
      result.source_wallet = await json.name;
      delete result.source_wallet_id;
    }
    {
      const wallet = await this.walletService.getById(destination_wallet_id);
      const json = await wallet.toJSON();
      result.destination_wallet = await json.name;
      delete result.destination_wallet_id;
    }
    return result;
  }

}

module.exports = TransferService;
