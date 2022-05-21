const uuid = require('uuid');
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');

const TransferService = require('./TransferService');
const WalletService = require('./WalletService');

chai.use(sinonChai);
const { expect } = chai;
const Session = require('../models/Session');
const Wallet = require('../models/Wallet');
const MQService = require("./MQService");
const TransferRepository = require("../repositories/TransferRepository");

describe('TransferService', () => {
  let transferService;
  describe('', () => {
    const session = new Session();
    transferService = new TransferService(session);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('convertToResponse', async () => {
    const transferId1 = uuid.v4();
    const walletId1 = uuid.v4();
    const transferObject = {
      id: transferId1,
      originator_wallet_id: walletId1,
      source_wallet_id: walletId1,
      destination_wallet_id: walletId1,
    };
    sinon.stub(WalletService.prototype, 'getById').resolves(
      new Wallet({
        id: walletId1,
        name: 'testName',
      }),
    );
    const result = await transferService.convertToResponse(transferObject);
    console.warn('xxx:', result);
    expect(result).property('source_wallet').eq('testName');
    expect(result).property('originating_wallet').eq('testName');
    expect(result).property('destination_wallet').eq('testName');
  });

  describe("sendMessage", () => {

    it("Successfully", async () => {
      const transferId = "x";
      const transfer = {
        id: transferId,
        destination_wallet_id: 1,
        source_wallet_id: 2,
      }
      const walletA = new Wallet({
        id: uuid.v1(),
        name: "walletA",
      });
      const walletB = new Wallet({
        id: uuid.v1(),
        name: "walletB",
      });
      const sendMessage = sinon.stub(MQService.prototype, "sendMessage");
      sinon.stub(TransferRepository.prototype, "getById").resolves(transfer);
      sinon.stub(TransferRepository.prototype, "getTokenAndCaptureIds").resolves([{
        token_id: "t",
        capture_id: "c",
      }]);
      sinon.stub(WalletService.prototype, "getById")
        .onFirstCall()
        .resolves(walletA)
        .onSecondCall()
        .resolves(walletB);
      await transferService.sendMessage(transferId);
      sinon.assert.calledWith(sendMessage, sinon.match({
        // TODO can not match type, why?
        // type: "TokenAssigned",
        wallet_name: "walletA",
        wallet_name_sender: "walletB",
        transfer_id: transferId,
        entries: [{
          capture_id: "c",
          token_id: "t",
        }],
      }));

    });

  });
});
