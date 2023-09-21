const TokenService = require("./TokenService");
const sinon = require("sinon");
const TokenRepository = require("../repositories/TokenRepository");
const HttpError = require("../utils/HttpError");
const jestExpect = require("expect");
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const {expect} = chai;
const Wallet = require("../models/Wallet");
const Token = require("../models/Token");
const WalletService = require("../services/WalletService");
const Session = require("../models/Session");
const TransactionRepository = require("../repositories/TransactionRepository");
const uuid = require('uuid');

describe("Token", () => {
  let tokenService;
  let session = new Session();

  beforeEach(() => {
    tokenService = new TokenService();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("getById() with id which doesn't exist, should throw 404", async () => {
    sinon.stub(TokenRepository.prototype, "getById").rejects(new HttpError(404, "not found"));
    await jestExpect(async () => {
      await tokenService.getById("testUuid");
    }).rejects.toThrow('not found');
    TokenRepository.prototype.getById.restore();
  });

  it("getTokensByBundle", async () => {
    const walletId1 = uuid.v4();
    const tokenId1 = uuid.v4();
    const wallet = new Wallet(walletId1, session);
    const fn = sinon.stub(TokenRepository.prototype, "getByFilter").resolves([
      {
        id: tokenId1,
      }
    ], session);
    const result = await tokenService.getTokensByBundle(wallet, 1);
    expect(result).a("array").lengthOf(1);
    expect(result[0]).instanceOf(Token);
    expect(fn).calledWith({
      wallet_id: walletId1,
      transfer_pending: false,
    },{
      limit: 1,
    });
  });

  it("countTokenByWallet", async () => {
    const walletId1 = uuid.v4();
    const wallet = new Wallet(walletId1, session);
    const fn = sinon.stub(TokenRepository.prototype, "countByFilter").resolves(1);
    const result = await tokenService.countTokenByWallet(wallet);
    expect(result).eq(1);
    expect(fn).calledWith({
      wallet_id: walletId1,
    });
    fn.restore();
  });

  it("convertToResponse", async () => {
    const transactionId1 = uuid.v4();
    const tokenId1 = uuid.v4();
    const walletId1 = uuid.v4();
    const walletId2 = uuid.v4();
    const captureId1 = uuid.v4();
    const transactionObject = {
      id: transactionId1,
      token_id: tokenId1,
      source_wallet_id: walletId1,
      destination_wallet_id: walletId2,
    }
    sinon.stub(TokenService.prototype, "getById").resolves(new Token({
      id: tokenId1,
      capture_id: captureId1,
    }));
    sinon.stub(WalletService.prototype, "getById").resolves(new Wallet({
      id: walletId1,
      name: "testName",
    }));
    const result = await tokenService.convertToResponse(transactionObject);
    expect(result).property("token").eq(tokenId1);
    expect(result).property("sender_wallet").eq("testName");
    expect(result).property("receiver_wallet").eq("testName");
  });

  describe("getTokensByTransferId", () => {

    it("Successfuly", async () => {
      const tokenId2 = uuid.v4();
      const transferId1 = uuid.v4();
      const fn = sinon.stub(TokenRepository.prototype, "getByTransferId").resolves({rows:[{id:tokenId2}]});
      const tokens = await tokenService.getTokensByTransferId(transferId1);
      expect(fn).calledWith(transferId1);
      expect(tokens).lengthOf(1);
    });
  });

  it("completeTransfer", async () => {
    const tokenId1 = uuid.v4();
    const transferId1 = uuid.v4();
    const token1 = new Token({id:tokenId1});
    const updateByIds = sinon.stub(TokenRepository.prototype, "updateByIds");
    const batchCreate = sinon.stub(TransactionRepository.prototype, "batchCreate");
    const transfer = {
      destination_wallet_id: transferId1,
    }
    const tokens = await tokenService.completeTransfer([token1], transfer);
    expect(updateByIds).calledWith(sinon.match({wallet_id:transferId1}), [tokenId1]);
  });

  it("pendingTransfer", async () => {
    const tokenId1 = uuid.v4();
    const transferId1 = uuid.v4();
    const token1 = new Token({id:tokenId1});
    const updateByIds = sinon.stub(TokenRepository.prototype, "updateByIds");
    const batchCreate = sinon.stub(TransactionRepository.prototype, "batchCreate");
    const transfer = {
      id: transferId1,
      destination_wallet_id: transferId1,
    }
    const tokens = await tokenService.pendingTransfer([token1], transfer);
    expect(updateByIds).calledWith(sinon.match({transfer_pending: true, transfer_pending_id:transferId1}), [tokenId1]);
  });

  it("cancelTransfer", async () => {
    const tokenId1 = uuid.v4();
    const transferId1 = uuid.v4();
    const token1 = new Token({id:tokenId1});
    const updateByIds = sinon.stub(TokenRepository.prototype, "updateByIds");
    const batchCreate = sinon.stub(TransactionRepository.prototype, "batchCreate");
    const transfer = {
      id: transferId1,
      destination_wallet_id: transferId1,
    }
    const tokens = await tokenService.cancelTransfer([token1], transfer);
    expect(updateByIds).calledWith(sinon.match({transfer_pending: false, transfer_pending_id:null}), [tokenId1]);
  });

});
