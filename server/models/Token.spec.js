const Token = require("./Token");
const jestExpect = require("expect");
const sinon = require("sinon");
const TokenRepository = require("../repositories/TokenRepository");
const HttpError = require("../utils/HttpError");
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const {expect} = chai;
const TransactionRepository = require("../repositories/TransactionRepository");
const Wallet = require("./Wallet");
const Session = require("./Session");

describe("Token", () => {
  let session = new Session();

  beforeEach(() => {
  })

  it("constructor by object", () => {
    const token = new Token({
      id: 1,
    }, session);
    expect(token).instanceOf(Token);
    expect(token.getId()).eq(1);
  });

  describe("pendingTransfer", () => {

    it("pendingTransfer successfully", async () => {
      const token = new Token(1, session);
      const transfer = {id:1};
      const fn1 = sinon.stub(TokenRepository.prototype, "update");
      await token.pendingTransfer(transfer);
      expect(fn1).calledWith({
        id: 1,
        transfer_pending: true,
        transfer_pending_id: 1,
      });
      fn1.restore();
    });
  });

  describe("completeTransfer", () => {

    it("completeTransfer successfully", async () => {
      const token = new Token(1, session);
      const transfer = {
        id:1,
        source_entity_id: 1,
        destination_entity_id: 2,
      };
      const fn1 = sinon.stub(TokenRepository.prototype, "update");
      const fn2 = sinon.stub(TransactionRepository.prototype, "create");
      await token.completeTransfer(transfer);
      expect(fn1).calledWith({
        id: 1,
        entity_id: 2,
        transfer_pending: false,
        transfer_pending_id: 1,
      });
      expect(fn2).calledWith({
        token_id: 1,
        transfer_id: 1,
        source_entity_id: 1,
        destination_entity_id: 2,
      });
      fn1.restore();
      fn2.restore();
    });
  });

  describe("cancelTransfer", () => {

    it("cancelTransfer successfully", async () => {
      const token = new Token(1, session);
      const transfer = {
        id:1,
        source_entity_id: 1,
        destination_entity_id: 2,
      };
      const fn1 = sinon.stub(TokenRepository.prototype, "update");
      const fn2 = sinon.stub(TransactionRepository.prototype, "create");
      await token.cancelTransfer(transfer);
      expect(fn1).calledWith({
        id: 1,
        transfer_pending: false,
        transfer_pending_id: 1,
      });
      expect(fn2).not.calledWith();
      fn1.restore();
      fn2.restore();
    });
  });

  describe("belongsTo", () => {

    it("belongsTo", async () => {
      const token = new Token(1, session);
      const wallet = new Wallet(2, session);
      const fn1 = sinon.stub(TokenRepository.prototype, "getById").resolves({
        id: 1,
        entity_id: 2,
      });
      expect(await token.belongsTo(wallet)).eq(true);
      expect(fn1).calledWith();
      fn1.restore();
    });

    it("not belongsTo", async () => {
      const token = new Token(1, session);
      const wallet = new Wallet(2, session);
      const fn1 = sinon.stub(TokenRepository.prototype, "getById").resolves({
        id: 1,
        entity_id: 1,
      });
      expect(await token.belongsTo(wallet)).eq(false);
      expect(fn1).calledWith();
      fn1.restore();
    });
  });

});
