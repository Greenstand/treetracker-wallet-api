const TransferService = require("./TransferService");
const WalletService = require("./WalletService");
const jestExpect = require("expect");
const sinon = require("sinon");
const chai = require("chai");
const sinonChai = require("sinon-chai");

chai.use(sinonChai);
const {expect} = chai;
const uuid = require('uuid');
const Session = require("../models/Session");
const Wallet = require("../models/Wallet");

describe("TransferService", () => {
  let transferService ;
  describe("", () => {
    const session = new Session();
    transferService = new TransferService(session);

  });

  afterEach(() => {
    sinon.restore();
  });

  it("convertToResponse", async () => {
    const transferId1 = uuid.v4();
    const walletId1 = uuid.v4();
    const transferObject = {
      id: transferId1,
      originator_wallet_id: walletId1,
      source_wallet_id: walletId1,
      destination_wallet_id: walletId1,
    }
    sinon.stub(WalletService.prototype, "getById").resolves(new Wallet({
      id: walletId1,
      name: "testName",
    }));
    const result = await transferService.convertToResponse(transferObject);
    console.warn("xxx:", result);
    expect(result).property("source_wallet").eq("testName");
    expect(result).property("originating_wallet").eq("testName");
    expect(result).property("destination_wallet").eq("testName");
  });
});
