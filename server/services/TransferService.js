const WalletService = require('./WalletService');
const _ = require("lodash");
const Transfer = require("../models/Transfer");
const TransferRepository = require("../repositories/TransferRepository");

class TransferService {
  constructor(session) {
    this._session = session;
    this.walletService = new WalletService(session);
    this.transferRepository = new TransferRepository(session);
  }

  async convertToResponse(transferObject) {
    const {
      originator_wallet_id,
      source_wallet_id,
      destination_wallet_id,
    } = transferObject;
    const result = { ...transferObject };
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

    // deal with the impact value
    if(
      Transfer.isImpactValue(result) &&
      Transfer.hasCompleted(result)
    ){
      const impactValue = await this.transferRepository.getImpactValue(result.id);
      result.impact_value_transferred = impactValue;
    }
    return result;
  }
}

module.exports = TransferService;
