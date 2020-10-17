const TransferService = require("./TransferService");
const WalletService = require("./WalletService");
const Wallet = require("../models/Wallet");
const jestExpect = require("expect");
const sinon = require("sinon");
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const {expect} = chai;

describe("TransferService", () => {
  let transferService = new TransferService();

  describe("", () => {
  });

  afterEach(() => {
    sinon.restore();
  });

  it("convertToResponse", async () => {
    const transferObject = {
      id: 1,
      originator_entity_id: 1,
      source_entity_id: 1,
      destination_entity_id: 1,
    }
    sinon.stub(WalletService.prototype, "getById").resolves(new Wallet({
      id: 1,
      name: "testName",
    }));
    const result = await transferService.convertToResponse(transferObject);
    console.warn("xxx:", result);
    expect(result).property("source_wallet").eq("testName");
    expect(result).property("originating_wallet").eq("testName");
    expect(result).property("destination_wallet").eq("testName");
  });
});
