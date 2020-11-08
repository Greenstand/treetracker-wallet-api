const Wallet = require("./Wallet");
const jestExpect = require("expect");
const sinon = require("sinon");
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const {expect} = chai;
const WalletRepository = require("../repositories/WalletRepository");
const TrustRepository = require("../repositories/TrustRepository");
const WalletService = require("../services/WalletService");
const TransferRepository = require("../repositories/TransferRepository");
const HttpError = require("../utils/HttpError");
const TrustRelationship = require("../models/TrustRelationship");
const Transfer = require("./Transfer");
const Token = require("./Token");
const TokenService = require("../services/TokenService");

describe("Wallet", () => {
  let walletService;
  let wallet;
  const walletObject = {
    id:1, 
    salt:"salet",
    password: "testPasswordHash",
  };

  beforeEach(() => {
    wallet = new Wallet(1);
    walletService = new WalletService();
  })

  afterEach(() => {
    sinon.restore();
  });

  it("authorize() with empty parameters should get 400 error", async () => {
    sinon.stub(WalletRepository.prototype, "getByName").resolves({id:1});
    const wallet = await walletService.getByName("test");
    expect(wallet).instanceOf(Wallet);
    await jestExpect(async () => {
      await wallet.authorize(undefined);
    }).rejects.toThrow(/no password/i);
    WalletRepository.prototype.getByName.restore();
  });

  it("authorize() with wallet which doesn't exists, should throw 401", async () => {
    sinon.stub(WalletRepository.prototype, "getByName").rejects(new HttpError(404, "not found"));
    await jestExpect(async () => {
      const wallet = await walletService.getByName("test");
      await wallet.authorize(undefined);
    }).rejects.toThrow(/not found/);
    WalletRepository.prototype.getByName.restore();
  });


  it("authorize() with correct wallet, password, should return a wallet object", async () => {
    sinon.stub(WalletRepository.prototype, "getById").resolves(walletObject);
    sinon.stub(Wallet, "sha512").returns("testPasswordHash");
    const walletObjectResult = await wallet.authorize("testPassword");
    expect(walletObjectResult).property("id").eq(1);
    WalletRepository.prototype.getById.restore();
    Wallet.sha512.restore();
  });


  it("getTrustRelationshipsRequested", async () => {
    const fn = sinon.stub(Wallet.prototype, "getTrustRelationships").resolves([{
      id: 1,
      originator_entity_id: 1,
    }]);
    const trust_relationships = await wallet.getTrustRelationshipsRequested();
    expect(trust_relationships).lengthOf(1);
    fn.restore();
  });

  describe("Request trust", () => {
    let wallet;

    beforeEach(() => {
      wallet = new Wallet(1);
    })

    it("request with a wrong type would throw error", async () => {
      await jestExpect(async () => {
        await wallet.requestTrustFromAWallet("wrongType","test")
      }).rejects.toThrow("type");
    });

    it("request with trust which has existed should throw 403", async () => {
      const wallet2 = new Wallet(2);
      const fn = sinon.stub(Wallet.prototype, "getTrustRelationships").resolves([{
        type: TrustRelationship.ENTITY_TRUST_TYPE.send,
        actor_entity_id: wallet.getId(),
        target_entity_id: wallet2.getId(),
        request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
        originator_entity_id: wallet.getId(),
      }]);
      await jestExpect(async () => {
        await wallet.requestTrustFromAWallet("send",wallet, wallet2);
      }).rejects.toThrow(/existed/i);
      fn.restore();
    });

    it("request successfully", async () => {
      const wallet2 = new Wallet(2);
      const fn2 = sinon.stub(TrustRepository.prototype, "get").resolves([]);
      const fn3 = sinon.stub(TrustRepository.prototype, "create");
      await wallet.requestTrustFromAWallet(
        TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
        wallet,
        wallet2,
      );
      expect(fn3).to.have.been.calledWith(
        sinon.match({
          actor_entity_id: 1,
          originator_entity_id: 1,
          request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
          type: TrustRelationship.ENTITY_TRUST_TYPE.send,
        }),
      );
      fn2.restore();
      fn3.restore();
    });

    describe("Request trust for sub wallet", () => {

      it("To request sub wallet to which I don't have permission, throw 403", async () => {
        const wallet2 = new Wallet(2);
        const wallet3 = new Wallet(3);
        sinon.stub(Wallet.prototype, "hasControlOver").resolves(false);
        await jestExpect(async () => {
          await wallet.requestTrustFromAWallet("send",wallet2, wallet3);
        }).rejects.toThrow(/permission.*actor/i);
      });

      it("Successful", async () => {
        const wallet2 = new Wallet(2);
        const wallet3 = new Wallet(3);
        sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
        sinon.stub(TrustRepository.prototype, "create").resolves({});
        await wallet.requestTrustFromAWallet("send",wallet2, wallet3);
      });
    });
  });

  describe("Accept trust", () => {
    let wallet; 

    beforeEach(() => {
      wallet = new Wallet(1);
    })

    it("accept but the requested trust whose target id is not me, throw 403", async () => {
      const trustRelationship = {
        id: 1,
        target_entity_id: wallet.getId(),
      };
      const fn1 = sinon.stub(TrustRepository.prototype, "getByTargetId").returns([trustRelationship]);
      const fn2 = sinon.stub(TrustRepository.prototype, "update");
      await jestExpect(async () => {
        await wallet.acceptTrustRequestSentToMe(2);
      }).rejects.toThrow(/no permission/i);
      fn1.restore();
      fn2.restore();
    });

    it("accept successfully", async () => {
      const trustRelationship = {
        id: 1,
        target_entity_id: wallet.getId(),
      };
      const fn1 = sinon.stub(TrustRepository.prototype, "getByTargetId").returns([trustRelationship]);
      const fn2 = sinon.stub(TrustRepository.prototype, "update");
      await wallet.acceptTrustRequestSentToMe(trustRelationship.id);
      fn1.restore();
      fn2.restore();
    });
  });

  describe("Decline trust", () => {
    let wallet;

    beforeEach(() => {
      wallet = new Wallet(1);
    })

    it("decline but the requested trust whose target id is not me, throw 403", async () => {
      const trustRelationship = {
        id: 1,
        target_entity_id: wallet.getId(),
      };
      const fn1 = sinon.stub(TrustRepository.prototype, "getByTargetId").returns([trustRelationship]);
      const fn2 = sinon.stub(TrustRepository.prototype, "update");
      await jestExpect(async () => {
        await wallet.declineTrustRequestSentToMe(2);
      }).rejects.toThrow(/no permission/i);
      fn1.restore();
      fn2.restore();
    });

    it("decline successfully", async () => {
      const trustRelationship = {
        id: 1,
        target_entity_id: wallet.getId(),
      };
      const fn1 = sinon.stub(TrustRepository.prototype, "getByTargetId").returns([trustRelationship]);
      const fn2 = sinon.stub(TrustRepository.prototype, "update");
      await wallet.declineTrustRequestSentToMe(trustRelationship.id);
      fn1.restore();
      fn2.restore();
    });
  });

  describe("Cancel trust request", () => {
    let wallet;

    beforeEach(() => {
      wallet = new Wallet(1);
    })

    it("Try to cancel but the requested trust whose originator id is not me, throw 403", async () => {
      const trustRelationship = {
        id: 1,
        target_entity_id: wallet.getId(),
      };
      const fn1 = sinon.stub(TrustRepository.prototype, "getById").returns(trustRelationship);
      const fn2 = sinon.stub(TrustRepository.prototype, "update");
      await jestExpect(async () => {
        await wallet.cancelTrustRequestSentToMe(2);
      }).rejects.toThrow(/no permission/i);
      fn1.restore();
      fn2.restore();
    });

    it("cancel successfully", async () => {
      const trustRelationship = {
        id: 1,
        originator_entity_id: wallet.getId(),
      };
      const fn1 = sinon.stub(TrustRepository.prototype, "getById").returns(trustRelationship);
      const fn2 = sinon.stub(TrustRepository.prototype, "update");
      await wallet.cancelTrustRequestSentToMe(trustRelationship.id);
      fn1.restore();
      fn2.restore();
    });

    it.skip("TODO try to cancel but the state is inpropricate, should throw 403", () => {
    });
  });

  describe("checkTrust()", () => {

    it("checkTrust fails, should throw 403", async () => {
      const walletReceiver = new Wallet(2);
      const fn1 = sinon.stub(TrustRepository.prototype, "getTrustedByOriginatorId").resolves([]);//no relationship
      await jestExpect(async () => {
        await wallet.checkTrust(
          TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
          wallet,
          walletReceiver,
        );
      }).rejects.toThrow(/no permission/);
      fn1.restore();
    });

    it("checkTrust successfully", async () => {
      const walletReceiver = new Wallet(2);
      const fn1 = sinon.stub(Wallet.prototype, "getTrustRelationships").resolves([{
        request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
        type: TrustRelationship.ENTITY_TRUST_TYPE.send,
        actor_entity_id: wallet.getId(),
        target_entity_id: walletReceiver.getId(),
        state: TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
      }]);//no relationship
      await wallet.checkTrust(
        TrustRelationship.ENTITY_TRUST_TYPE.send,
        wallet,
        walletReceiver,
      );
      fn1.restore();
    });

    it("checkTrust successfully with recieve case", async () => {
      const wallet2 = new Wallet(2);
      const fn1 = sinon.stub(Wallet.prototype, "getTrustRelationshipsTrusted").resolves([{
        request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive,
        type: TrustRelationship.ENTITY_TRUST_TYPE.send,
        actor_entity_id: wallet2.getId(),
        target_entity_id: wallet.getId(),
      }]);//no relationship
      await wallet.checkTrust(
        TrustRelationship.ENTITY_TRUST_TYPE.send,
        wallet,
        wallet2,
      );
      fn1.restore();
    });

  });

  describe("Transfer", () => {

    it("If it is deduct, throw 403, do not support it yet", async () => {
      sinon.stub(Wallet.prototype, "checkDeduct").rejects(new HttpError(403, "deduct"));
      await jestExpect(async () => {
        await wallet.transfer();
      }).rejects.toThrow(/deduct/);
    });

    it("Given token uuid do not belongs to sender wallet, should throw 403", async () => {
      const fn1 = sinon.stub(Token.prototype, "belongsTo").resolves(false);
      const sender = new Wallet(1);
      const receiver = new Wallet(2);
      const token = new Token({
        id: 1,
        uuid: "uu",
      });
      await jestExpect(async () => {
        await wallet.transfer(sender, receiver, [token]);
      }).rejects.toThrow(/belongs/);
      fn1.restore();
    });

    it("don't have trust, sender under control, should return transfer with pending state", async () => {
      const fn0 = sinon.stub(Token.prototype, "belongsTo").resolves(true);
      const fn1 = sinon.stub(TransferRepository.prototype, "create").resolves({
        id: 1,
        state: Transfer.STATE.pending,
      });
      const fn2 = sinon.stub(wallet, "checkTrust").rejects(new HttpError(403));
      const sender = new Wallet(1);
      const receiver = new Wallet(2);
      const token = new Token({
        id: 1,
        uuid: "uu",
      });
      const transfer = await wallet.transfer(sender, receiver, [token]);
      expect(transfer).property("state").eq(Transfer.STATE.pending);
      expect(fn1).to.have.been.calledWith({
        originator_entity_id: 1,
        source_entity_id: 1,
        destination_entity_id: 2,
        state: Transfer.STATE.pending,
        parameters: {
          tokens: ["uu"],
        }
      });
      fn0.restore();
      fn1.restore();
      fn2.restore();
    });

    //This shouldn't be able to pass anymore, because this is a deduct case, this case do not support yet, check the test for "deduct"
    it.skip("don't have trust, receiver under control, should created a transfer request record", async () => {
      const fn0 = sinon.stub(Token.prototype, "belongsTo").resolves(true);
      const fn1 = sinon.stub(TransferRepository.prototype, "create").resolves({
        id: 1,
        state: Transfer.STATE.requested,
      });
      const fn2 = sinon.stub(wallet, "checkTrust").rejects(new HttpError(403));
      const sender = new Wallet(2);
      const receiver = new Wallet(1);
      const token = new Token({
        id: 1,
        uuid: "uu",
      });
      const transfer = await wallet.transfer(sender, receiver, [token]);
      expect(transfer).property("state").eq(Transfer.STATE.requested);
      expect(fn1).to.have.been.calledWith({
        originator_entity_id: 1,
        source_entity_id: 2,
        destination_entity_id: 1,
        state: Transfer.STATE.requested,
        parameters: {
          tokens: ["uu"],
        }
      });
      fn0.restore();
      fn1.restore();
      fn2.restore();
    });

    //This shouldn't be able to pass anymore, because this is a deduct case, this case do not support yet, check the test for "deduct"
    it.skip("have trust, should finish successfully", async () => {
      const sender = new Wallet(2);
      const receiver = new Wallet(3);
      const fn0 = sinon.stub(Token.prototype, "belongsTo").resolves(true);
      const fn1 = sinon.stub(wallet, "checkTrust");
      const fn2 = sinon.stub(TransferRepository.prototype, "create");
      const fn3 = sinon.stub(Token.prototype, "completeTransfer");
      const token = new Token({
        id: 1,
        uuid: "uu",
      });
      await wallet.transfer(sender, receiver, [token]);
      expect(fn2).calledWith(sinon.match({
        state: Transfer.STATE.completed,
      }));
      expect(fn3).calledWith();
      fn0.restore();
      fn1.restore();
      fn2.restore();
      fn3.restore();
    });

  });

  describe("Bundle transfer", () => {

    it("Sender doesn't have enough tokens to send, should throw 403", async () => {
      const sender = new Wallet(2);
      const receiver = new Wallet(3);
      const fn0 = sinon.stub(TokenService.prototype, "countTokenByWallet").resolves(1);
      await jestExpect(async () => {
        await wallet.transferBundle(sender, receiver, 2);
      }).rejects.toThrow(/enough/);
      fn0.restore();
    });

    it("don't have trust, sender under control, should created a transfer pending record", async () => {
      const fn0 = sinon.stub(TokenService.prototype, "countTokenByWallet").resolves(1);
      const fn1 = sinon.stub(TransferRepository.prototype, "create").resolves({
        id: 1,
        state: Transfer.STATE.pending,
      });
      const fn2 = sinon.stub(wallet, "checkTrust").rejects(new HttpError(403));
      const sender = new Wallet(1);
      const receiver = new Wallet(2);
      const transfer = await wallet.transferBundle(sender, receiver, 1);
      expect(transfer).property("state").eq(Transfer.STATE.pending);
      expect(fn1).to.have.been.calledWith({
        originator_entity_id: 1,
        source_entity_id: 1,
        destination_entity_id: 2,
        state: Transfer.STATE.pending,
        parameters: {
          bundle: {
            bundleSize: 1,
          }
        },
      });
      expect(fn0).calledWith(sender);
      fn1.restore();
      fn2.restore();
    });

    it("don't have trust, receiver under control, should created a transfer request record", async () => {
      const fn0 = sinon.stub(TokenService.prototype, "countTokenByWallet").resolves(1);
      const fn1 = sinon.stub(TransferRepository.prototype, "create").resolves({
        id: 1,
        state: Transfer.STATE.requested,
      });
      const fn2 = sinon.stub(wallet, "checkTrust").rejects(new HttpError(403));
      const sender = new Wallet(2);
      const receiver = new Wallet(1);
      const transfer = await wallet.transferBundle(sender, receiver, 1);
      expect(transfer).property("state").eq(Transfer.STATE.requested);
      expect(fn1).to.have.been.calledWith({
        originator_entity_id: 1,
        source_entity_id: 2,
        destination_entity_id: 1,
        state: Transfer.STATE.requested,
        parameters: {
          bundle: {
            bundleSize: 1,
          }
        },
      });
      fn0.restore();
      fn1.restore();
      fn2.restore();
    });

    it("have trust, should finish successfully", async () => {
      const sender = new Wallet(2);
      const receiver = new Wallet(3);
      const fn0 = sinon.stub(TokenService.prototype, "countTokenByWallet").resolves(1);
      const fn1 = sinon.stub(wallet, "checkTrust");
      const fn2 = sinon.stub(TransferRepository.prototype, "create");
      const fn3 = sinon.stub(Token.prototype, "completeTransfer");
      const fn4 = sinon.stub(TokenService.prototype, "getTokensByBundle").resolves([
        new Token(1)
      ]);
      await wallet.transferBundle(sender, receiver, 1);
      expect(fn2).calledWith(sinon.match({
        state: Transfer.STATE.completed,
      }));
      expect(fn3).calledWith();
      fn0.restore();
      fn1.restore();
      fn2.restore();
      fn3.restore();
      fn4.restore();
    });

  });

  describe("getPendingTransfers", () => {

    it("getPendingTransfers", async () => {
      const fn1 = sinon.stub(TransferRepository.prototype, "getPendingTransfers").resolves([{id:1}]);
      const result = await wallet.getPendingTransfers();
      expect(result).lengthOf(1);
      fn1.restore();
    });
  });

  describe("acceptTransfer", () => {

    it("acceptTransfer", async () => {
      const fn1 = sinon.stub(TransferRepository.prototype, "getById").resolves({id:1});  
      const fn2 = sinon.stub(TransferRepository.prototype, "update");
      const fn3 = sinon.stub(TokenService.prototype, "getTokensByPendingTransferId").resolves([new Token(1)]);
      const fn4 = sinon.stub(Token.prototype, "completeTransfer");
      const fn5 = sinon.stub(WalletService.prototype, "getById");
      const fn6 = sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
      await wallet.acceptTransfer(1);
      expect(fn2).calledWith(sinon.match({
        state: Transfer.STATE.completed,
      }));
      expect(fn4).calledWith();
      fn1.restore();
      fn2.restore();
      fn3.restore();
      fn4.restore();
      fn5.restore();
      fn6.restore();
    });

    it("acceptTransfer with bundle", async () => {
      const fn1 = sinon.stub(TransferRepository.prototype, "getById").resolves({
        id:1,
        source_entity_id: 1,
        parameters: {
          bundle: {
            bundleSize: 1,
          }
        },
      });  
      const fn2 = sinon.stub(TransferRepository.prototype, "update");
      const fn4 = sinon.stub(Token.prototype, "completeTransfer");
      const fn5 = sinon.stub(TokenService.prototype, "getTokensByBundle").resolves([ new Token(1)]);
      const fn6 = sinon.stub(WalletService.prototype, "getById");
      const fn7 = sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
      await wallet.acceptTransfer(1);
      expect(fn2).calledWith(sinon.match({
        state: Transfer.STATE.completed,
      }));
      expect(fn5).calledWith(sinon.match.any, 1);
      expect(fn4).calledWith();
      fn1.restore();
      fn2.restore();
      fn4.restore();
      fn5.restore();
      fn6.restore();
      fn7.restore();
    });
  });

  describe("declineTransfer", () => {

    it("declineTransfer", async () => {
      const fn1 = sinon.stub(TransferRepository.prototype, "getById").resolves({id:1});  
      const fn2 = sinon.stub(TransferRepository.prototype, "update");
      const fn3 = sinon.stub(TokenService.prototype, "getTokensByPendingTransferId").resolves([new Token(1)]);
      const fn4 = sinon.stub(Token.prototype, "cancelTransfer");
      const fn5 = sinon.stub(WalletService.prototype, "getById");
      const fn6 = sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
      await wallet.declineTransfer(1);
      expect(fn2).calledWith(sinon.match({
        state: Transfer.STATE.cancelled,
      }));
      expect(fn4).calledWith();
      fn1.restore();
      fn2.restore();
      fn3.restore();
      fn4.restore();
      fn5.restore();
      fn6.restore();
    });
  });

  describe("cancelTransfer", () => {

    it("cancelTransfer", async () => {
      const fn1 = sinon.stub(TransferRepository.prototype, "getById").resolves({id:1});  
      const fn2 = sinon.stub(TransferRepository.prototype, "update");
      const fn3 = sinon.stub(WalletService.prototype, "getById");
      const fn4 = sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
      await wallet.cancelTransfer(1);
      expect(fn2).calledWith(sinon.match({
        state: Transfer.STATE.cancelled,
      }));
      fn1.restore();
      fn2.restore();
      fn3.restore();
      fn4.restore();
    });
  });

  describe("fulfillTransfer", () => {

    it("fulfillTransfer successfully", async () => {
      const fn1 = sinon.stub(TransferRepository.prototype, "getById").resolves({
        id:1,
        source_entity_id: wallet.getId(),
        state: Transfer.STATE.requested,
      });  
      const fn2 = sinon.stub(TransferRepository.prototype, "update");
      const fn3 = sinon.stub(WalletService.prototype, "getById");
      const fn4 = sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
      await wallet.fulfillTransfer(1);
      fn1.restore();
      fn2.restore();
      fn3.restore();
      fn4.restore();
    });

    it("the transfer's sender is not me, should throw 403 no permission", async () => {
      const fn1 = sinon.stub(TransferRepository.prototype, "getById").resolves([{
        id:1,
        source_entity_id: wallet.getId() + 1,
      }]);  
      const fn2 = sinon.stub(WalletService.prototype, "getById");
      const fn3 = sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
      await jestExpect(async () => {
        await wallet.fulfillTransfer(1);
      }).rejects.toThrow(/permission/);
      fn1.restore();
      fn2.restore();
      fn3.restore();
    });

    it("the transfer's state is not requested, should throw 403 forbidden", async () => {
      const fn1 = sinon.stub(TransferRepository.prototype, "getById").resolves({
        id:1,
        source_entity_id: wallet.getId(),
      });  
      const fn2 = sinon.stub(WalletService.prototype, "getById");
      const fn3 = sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
      await jestExpect(async () => {
        await wallet.fulfillTransfer(1);
      }).rejects.toThrow(/forbidden/);
      fn1.restore();
      fn2.restore();
      fn3.restore();
    });
  });

  describe("getTransfers", () => {

    it("getTransfers", async () => {
      const fn1 = sinon.stub(TransferRepository.prototype, "getByFilter").resolves([{id:1}]);
      const result = await wallet.getTransfers();
      expect(result).lengthOf(1);
      fn1.restore();
    });
  });

  describe("hasControlOver", () => {

    it("hasControlOver should pass if it is the same wallet", async () => {
      const walletB = new Wallet(1);
      await wallet.hasControlOver(walletB); 
    });
  });

  describe("getTrustRelationships", () => {

    it("successfully", async () => {
      const fn = sinon.stub(TrustRepository.prototype, "getByFilter").resolves([{id:1}]);
      const result = await wallet.getTrustRelationships(
        TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
        TrustRelationship.ENTITY_TRUST_TYPE.send,
        TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
      );
      expect(result).lengthOf(1);
      expect(fn).calledWith({
        and: [{
          state: TrustRelationship.ENTITY_TRUST_STATE_TYPE.trusted,
        },{
          type: TrustRelationship.ENTITY_TRUST_TYPE.send,
        },{
          request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
        },{
          or: [{
            actor_entity_id: wallet.getId(),
          },{
            target_entity_id: wallet.getId(),
          },{
            originator_entity_id: wallet.getId(),
          }]
        }]
      });
      fn.restore();
    });

    it("without filters", async () => {
      const fn = sinon.stub(TrustRepository.prototype, "getByFilter").resolves([{id:1}]);
      const result = await wallet.getTrustRelationships();
      expect(result).lengthOf(1);
      expect(fn).calledWith({
        and: [{
          or: [{
            actor_entity_id: wallet.getId(),
          },{
            target_entity_id: wallet.getId(),
          },{
            originator_entity_id: wallet.getId(),
          }]
        }]
      });
      fn.restore();
    });
  });

  describe("Deduct", () => {

    it("the sender is me, should be able to pass", async () => {
      const wallet = new Wallet(1);
      const sender = wallet;
      const receiver = new Wallet(2);
      await wallet.checkDeduct(sender, receiver);
    });

    it("The sender is my sub wallet, should be able to pass", async () => {
      const wallet = new Wallet(1);
      const sender = new Wallet(2);
      const receiver = new Wallet(3);
      sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
      await wallet.checkDeduct(sender, receiver);
    });

    it("The sender isn't my sub wallet, should throw 403", async () => {
      const wallet = new Wallet(1);
      const sender = new Wallet(2);
      const receiver = new Wallet(3);
      sinon.stub(Wallet.prototype, "hasControlOver").resolves(false);
      await jestExpect(async () => {
        await wallet.checkDeduct(sender, receiver);
      }).rejects.toThrow(/deduct/);
    });
  });

});
