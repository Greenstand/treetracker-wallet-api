const WalletService = require('./WalletService');
const MQService = require("./MQService");
const log = require("loglevel");
const TransferRepository = require('../repositories/TransferRepository');

class TransferService {
  constructor(session) {
    this._session = session;
    this._walletService = new WalletService(session);
    this._mqService = new MQService();
    this._transferRepository = new TransferRepository(session);
  }

  async convertToResponse(transferObject) {
    const {
      originator_wallet_id,
      source_wallet_id,
      destination_wallet_id,
    } = transferObject;
    const result = { ...transferObject };
    {
      const wallet = await this._walletService.getById(originator_wallet_id);
      const json = await wallet.toJSON();
      result.originating_wallet = json.name;
      delete result.originator_wallet_id;
    }
    {
      const wallet = await this._walletService.getById(source_wallet_id);
      const json = await wallet.toJSON();
      result.source_wallet = await json.name;
      delete result.source_wallet_id;
    }
    {
      const wallet = await this._walletService.getById(destination_wallet_id);
      const json = await wallet.toJSON();
      result.destination_wallet = await json.name;
      delete result.destination_wallet_id;
    }
    return result;
  }

  /*
   * Send message to queue, inform about the transfer detail, token, and 
   * associated tree/capture
   *
      {
      "type": "TokensAssigned",
      "wallet_name": "joeswallet",
      "entries": [
      { "capture_id": "63e00bca-8eb0-11eb-8dcd-0242ac130003", "token_id": "9d7abad8-8eb0-11eb-8dcd-0242ac130003" },
      { "capture_id": "8533b704-8eb0-11eb-8dcd-0242ac130003", "token_id":"a5799d94-8eb0-11eb-8dcd-0242ac130003" } ]
      }
   */
  async sendMessage(transferId){
    log.debug("send message");
    const transfer = await this._transferRepository.getById(transferId);
    const walletReceiver = await this._walletService.getById(transfer.destination_wallet_id);
    const walletReceiverObj = await walletReceiver.toJSON();
    const walletSender = await this._walletService.getById(transfer.source_wallet_id);
    const walletSenderObj = await walletSender.toJSON();
    const tokenData = await this._transferRepository.getTokenAndCaptureIds(transferId);
    const message = {
      transfer_id: transferId,
      type: "TokensAssigned",
      wallet_name : walletReceiverObj.name,
      wallet_name_sender : walletSenderObj.name,
      entries: tokenData,
    };
    await this._mqService.sendMessage(message);
  }

}

module.exports = TransferService;
