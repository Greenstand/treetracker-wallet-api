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

  const tokenId = uuid.v4()
  const transferId = uuid.v4()
  const walletId = uuid.v4()
  const wallet2Id = uuid.v4()

  beforeEach(() => {
  })

  it("constructor by object", () => {
    const token = new Token({
      id: tokenId,
    }, session);
    expect(token).instanceOf(Token);
    expect(token.getId()).eq(tokenId);
  });

  describe("pendingTransfer", () => {

    it("pendingTransfer successfully", async () => {
      const token = new Token(tokenId, session);
      const transfer = {id:transferId};
      const fn1 = sinon.stub(TokenRepository.prototype, "update");
      await token.pendingTransfer(transfer);
      expect(fn1).calledWith({
        id: tokenId,
        transfer_pending: true,
        transfer_pending_id: transferId,
      });
      fn1.restore();
    });
  });

  describe("completeTransfer", () => {

    it("completeTransfer successfully", async () => {
      const token = new Token(tokenId, session);
      const transfer = {
        id:tokenId,
        source_wallet_id: walletId,
        destination_wallet_id: wallet2Id,
      };
      const fn1 = sinon.stub(TokenRepository.prototype, "update");
      const fn2 = sinon.stub(TransactionRepository.prototype, "create");
      await token.completeTransfer(transfer);
      expect(fn1).calledWith({
        id: tokenId,
        wallet_id: walletId,
        transfer_pending: false,
        transfer_pending_id: transferId,
      });
      expect(fn2).calledWith({
        token_id: tokenId,
        transfer_id: transferId,
        source_wallet_id: wallet1Id,
        destination_wallet_id: wallet2Id,
      });
      fn1.restore();
      fn2.restore();
    });
  });

  describe("cancelTransfer", () => {

    it("cancelTransfer successfully", async () => {
      const token = new Token(tokenId, session);
      const transfer = {
        id:tokenId,
        source_wallet_id: walletId,
        destination_wallet_id: wallet2Id,
      };
      const fn1 = sinon.stub(TokenRepository.prototype, "update");
      const fn2 = sinon.stub(TransactionRepository.prototype, "create");
      await token.cancelTransfer(transfer);
      expect(fn1).calledWith({
        id: tokenId,
        transfer_pending: false,
        transfer_pending_id: transferId,
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
        wallet_id: 2,
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
        wallet_id: 1,
      });
      expect(await token.belongsTo(wallet)).eq(false);
      expect(fn1).calledWith();
      fn1.restore();
    });
  });

  describe("Transactions", () => {

    it("getTransactions", async () => {
      const token = new Token(1);
      sinon.stub(TransactionRepository.prototype, "getByFilter").resolves([{}]);
      const transactions = await token.getTransactions();
      expect(transactions).lengthOf(1);
    });

  });

});
