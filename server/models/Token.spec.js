// const sinon = require('sinon');
// const chai = require('chai');
// const sinonChai = require('sinon-chai');
// const uuid = require('uuid');
// const Token = require('./Token');
// const TokenRepository = require('../repositories/TokenRepository');

// chai.use(sinonChai);
// const { expect } = chai;
// const TransactionRepository = require('../repositories/TransactionRepository');
// const Wallet = require('./Wallet');
// const Session = require('../infra/database/Session');

// describe('Token', () => {
//   const session = new Session();

//   const tokenId = uuid.v4();
//   const transferId = uuid.v4();
//   const walletId = uuid.v4();
//   const wallet2Id = uuid.v4();

//   afterEach(() => {
//     sinon.restore();
//   });

//   it('constructor by object', () => {
//     const token = new Token(
//       {
//         id: tokenId,
//       },
//       session,
//     );
//     expect(token).instanceOf(Token);
//     expect(token.getId()).eq(tokenId);
//   });

//   describe('pendingTransfer', () => {
//     it('pendingTransfer successfully', async () => {
//       const token = new Token(tokenId, session);
//       const transfer = { id: transferId };
//       const fn1 = sinon.stub(TokenRepository.prototype, 'update');
//       await token.pendingTransfer(transfer);
//       expect(fn1).calledWith({
//         id: tokenId,
//         transfer_pending: true,
//         transfer_pending_id: transferId,
//       });
//       fn1.restore();
//     });
//   });

//   describe('completeTransfer', () => {
//     it('completeTransfer successfully', async () => {
//       const token = new Token(tokenId, session);
//       const transfer = {
//         id: transferId,
//         source_wallet_id: walletId,
//         destination_wallet_id: wallet2Id,
//         claim: false,
//       };
//       const fn1 = sinon.stub(TokenRepository.prototype, 'update');
//       const fn2 = sinon.stub(TransactionRepository.prototype, 'create');
//       await token.completeTransfer(transfer);
//       expect(fn1).calledWith({
//         id: tokenId,
//         wallet_id: wallet2Id,
//         transfer_pending: false,
//         transfer_pending_id: null,
//         claim: false,
//       });
//       expect(fn2).calledWith({
//         token_id: tokenId,
//         transfer_id: transferId,
//         source_wallet_id: walletId,
//         destination_wallet_id: wallet2Id,
//         claim: false,
//       });
//     });
//   });

//   describe('cancelTransfer', () => {
//     it('cancelTransfer successfully', async () => {
//       const token = new Token(tokenId, session);
//       const transfer = {
//         id: transferId,
//         source_wallet_id: walletId,
//         destination_wallet_id: wallet2Id,
//       };
//       const fn1 = sinon.stub(TokenRepository.prototype, 'update');
//       const fn2 = sinon.stub(TransactionRepository.prototype, 'create');
//       await token.cancelTransfer(transfer);
//       expect(fn1).calledWith({
//         id: tokenId,
//         transfer_pending: false,
//         transfer_pending_id: null,
//       });
//       expect(fn2).not.calledWith();
//     });
//   });

//   describe('belongsTo', () => {
//     it('belongsTo', async () => {
//       const token = new Token(tokenId, session);
//       const wallet = new Wallet(walletId, session);
//       const fn1 = sinon.stub(TokenRepository.prototype, 'getById').resolves({
//         id: tokenId,
//         wallet_id: walletId,
//       });
//       expect(await token.belongsTo(wallet)).eq(true);
//       expect(fn1).calledWith();
//     });

//     it('not belongsTo', async () => {
//       const token = new Token(tokenId, session);
//       const wallet = new Wallet(walletId, session);
//       const fn1 = sinon.stub(TokenRepository.prototype, 'getById').resolves({
//         id: tokenId,
//         wallet_id: wallet2Id,
//       });
//       expect(await token.belongsTo(wallet)).eq(false);
//       expect(fn1).calledWith();
//     });
//   });

//   describe('Transactions', () => {
//     it('getTransactions', async () => {
//       const token = new Token(tokenId);
//       sinon.stub(TransactionRepository.prototype, 'getByFilter').resolves([{}]);
//       const transactions = await token.getTransactions();
//       expect(transactions).lengthOf(1);
//     });
//   });
// });

// describe('Wallet', () => {
//   let walletService;
//   let wallet;
//   const session = new Session();

//   const walletObject = {
//     id: uuid.v4(),
//     salt: 'salet',
//     password: 'testPasswordHash',
//   };

//   beforeEach(() => {
//     wallet = new Wallet(uuid.v4(), session);
//     walletService = new WalletService(session);
//   });

//   afterEach(() => {
//     sinon.restore();
//   });

//   it('authorize() with empty parameters should get 400 error', async () => {
//     sinon
//       .stub(WalletRepository.prototype, 'getByName')
//       .resolves({ id: uuid.v4() });
//     const wallet = await walletService.getByName('test');
//     expect(wallet).instanceOf(Wallet);
//     await jestExpect(async () => {
//       await wallet.authorize(undefined);
//     }).rejects.toThrow(/no password/i);
//     WalletRepository.prototype.getByName.restore();
//   });

//   it("authorize() with wallet which doesn't exists, should throw 401", async () => {
//     sinon
//       .stub(WalletRepository.prototype, 'getByName')
//       .rejects(new HttpError(404, 'not found'));
//     await jestExpect(async () => {
//       const wallet = await walletService.getByName('test');
//       await wallet.authorize(undefined);
//     }).rejects.toThrow(/not found/);
//     WalletRepository.prototype.getByName.restore();
//   });

//   it('authorize() with correct wallet, password, should return a wallet object', async () => {
//     sinon.stub(WalletRepository.prototype, 'getById').resolves(walletObject);
//     sinon.stub(Wallet, 'sha512').returns('testPasswordHash');
//     const walletObjectResult = await wallet.authorize('testPassword');
//     expect(walletObjectResult).property('id').eq(walletObject.id);
//     WalletRepository.prototype.getById.restore();
//     Wallet.sha512.restore();
//   });

//   it('getTrustRelationshipsRequested', async () => {
//     const fn = sinon.stub(Wallet.prototype, 'getTrustRelationships').resolves([
//       {
//         id: uuid.v4(),
//         originator_wallet_id: wallet.getId(),
//       },
//     ]);
//     const trust_relationships = await wallet.getTrustRelationshipsRequested();
//     expect(trust_relationships).lengthOf(1);
//     fn.restore();
//   });

//   describe('Request trust', () => {
//     const wallet = new Wallet(uuid.v4());
//     const wallet2 = new Wallet(uuid.v4());
//     const wallet3 = new Wallet(uuid.v4());

//     it('request with a wrong type would throw error', async () => {
//       await jestExpect(async () => {
//         await wallet.requestTrustFromAWallet('wrongType', 'test');
//       }).rejects.toThrow('must be one of');
//     });

//     it('request successfully', async () => {
//       const fn2 = sinon.stub(TrustRepository.prototype, 'get').resolves([]);
//       const fn3 = sinon.stub(TrustRepository.prototype, 'create');
//       sinon.stub(Wallet.prototype, 'checkDuplicateRequest');
//       await wallet.requestTrustFromAWallet(
//         TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//         wallet,
//         wallet2,
//       );
//       expect(fn3).to.have.been.calledWith(
//         sinon.match({
//           actor_wallet_id: wallet.getId(),
//           originator_wallet_id: wallet.getId(),
//           request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//           type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         }),
//       );
//       fn2.restore();
//       fn3.restore();
//     });

//     describe('Request trust for sub wallet', () => {
//       it("To request sub wallet to which I don't have permission, throw 403", async () => {
//         sinon.stub(Wallet.prototype, 'hasControlOver').resolves(false);
//         await jestExpect(async () => {
//           await wallet.requestTrustFromAWallet('send', wallet2, wallet3);
//         }).rejects.toThrow(/permission.*actor/i);
//       });

//       it('Successful', async () => {
//         sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//         sinon.stub(TrustRepository.prototype, 'create').resolves({});
//         sinon.stub(Wallet.prototype, 'checkDuplicateRequest');
//         await wallet.requestTrustFromAWallet('send', wallet2, wallet3);
//       });
//     });
//   });

//   describe('Accept trust', () => {
//     const wallet = new Wallet(uuid.v4());
//     const trustId = uuid.v4();
//     const trustRelationship = {
//       id: trustId,
//       target_wallet_id: wallet.getId(),
//     };

//     it('accept but the requested trust whose target id is not me, throw 403', async () => {
//       const fn1 = sinon
//         .stub(Wallet.prototype, 'getTrustRelationshipsRequestedToMe')
//         .returns([trustRelationship]);
//       const fn2 = sinon.stub(TrustRepository.prototype, 'update');
//       sinon.stub(Wallet.prototype, 'checkManageCircle');
//       await jestExpect(async () => {
//         await wallet.acceptTrustRequestSentToMe(2);
//       }).rejects.toThrow(/no permission/i);
//       fn1.restore();
//       fn2.restore();
//     });

//     it('accept successfully', async () => {
//       const fn1 = sinon
//         .stub(Wallet.prototype, 'getTrustRelationshipsRequestedToMe')
//         .returns([trustRelationship]);
//       const fn2 = sinon.stub(TrustRepository.prototype, 'update');
//       sinon.stub(Wallet.prototype, 'checkManageCircle');
//       await wallet.acceptTrustRequestSentToMe(trustRelationship.id);
//       fn1.restore();
//       fn2.restore();
//     });
//   });

//   describe('Decline trust', () => {
//     const wallet = new Wallet(uuid.v4());
//     const trustId = uuid.v4();
//     const trustRelationship = {
//       id: trustId,
//       target_wallet_id: wallet.getId(),
//     };

//     it('decline but the requested trust whose target id is not me, throw 403', async () => {
//       const fn1 = sinon
//         .stub(Wallet.prototype, 'getTrustRelationshipsRequestedToMe')
//         .returns([trustRelationship]);
//       const fn2 = sinon.stub(TrustRepository.prototype, 'update');
//       await jestExpect(async () => {
//         await wallet.declineTrustRequestSentToMe(2);
//       }).rejects.toThrow(/no permission/i);
//       fn1.restore();
//       fn2.restore();
//     });

//     it('decline successfully', async () => {
//       const fn1 = sinon
//         .stub(Wallet.prototype, 'getTrustRelationshipsRequestedToMe')
//         .returns([trustRelationship]);
//       const fn2 = sinon.stub(TrustRepository.prototype, 'update');
//       await wallet.declineTrustRequestSentToMe(trustRelationship.id);
//       fn1.restore();
//       fn2.restore();
//     });
//   });

//   describe('Cancel trust request', () => {
//     const wallet = new Wallet(uuid.v4());
//     const trustId = uuid.v4();

//     it('Try to cancel but the requested trust whose originator id is not me, throw 403', async () => {
//       const trustRelationship = {
//         id: trustId,
//         target_wallet_id: wallet.getId(),
//       };
//       const fn1 = sinon
//         .stub(TrustRepository.prototype, 'getById')
//         .returns(trustRelationship);
//       const fn2 = sinon.stub(TrustRepository.prototype, 'update');
//       await jestExpect(async () => {
//         await wallet.cancelTrustRequestSentToMe(trustId);
//       }).rejects.toThrow(/no permission/i);
//       fn1.restore();
//       fn2.restore();
//     });

//     it('cancel successfully', async () => {
//       const trustRelationship = {
//         id: trustId,
//         originator_wallet_id: wallet.getId(),
//       };
//       const fn1 = sinon
//         .stub(TrustRepository.prototype, 'getById')
//         .returns(trustRelationship);
//       const fn2 = sinon.stub(TrustRepository.prototype, 'update');
//       await wallet.cancelTrustRequestSentToMe(trustId);
//       fn1.restore();
//       fn2.restore();
//     });

//     it.skip('TODO try to cancel but the state is inpropricate, should throw 403', () => {});
//   });

//   describe('hasTrust()', () => {
//     const wallet = new Wallet(uuid.v4());
//     const wallet2 = new Wallet(uuid.v4());

//     it('has no trust', async () => {
//       const fn1 = sinon
//         .stub(Wallet.prototype, 'getTrustRelationshipsTrusted')
//         .resolves([]); // no relationship
//       const result = await wallet.hasTrust(
//         TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//         wallet,
//         wallet2,
//       );
//       expect(result).eq(false);
//       fn1.restore();
//     });

//     it('has trust', async () => {
//       const fn1 = sinon
//         .stub(Wallet.prototype, 'getTrustRelationships')
//         .resolves([
//           {
//             request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//             type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//             actor_wallet_id: wallet.getId(),
//             target_wallet_id: wallet2.getId(),
//             state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
//           },
//         ]);
//       const result = await wallet.hasTrust(
//         TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         wallet,
//         wallet2,
//       );
//       expect(result).eq(true);
//       fn1.restore();
//     });

//     it('has trust with receive case', async () => {
//       const fn1 = sinon
//         .stub(Wallet.prototype, 'getTrustRelationshipsTrusted')
//         .resolves([
//           {
//             request_type:
//               TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.receive,
//             type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//             actor_wallet_id: wallet2.getId(),
//             target_wallet_id: wallet.getId(),
//           },
//         ]);
//       const result = await wallet.hasTrust(
//         TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         wallet,
//         wallet2,
//       );
//       expect(result).eq(true);
//       fn1.restore();
//     });
//   });

//   describe('Transfer', () => {
//     const sender = new Wallet(uuid.v4());
//     const receiver = new Wallet(uuid.v4());
//     const token = new Token(
//       {
//         id: uuid.v4(),
//       },
//       session,
//     );

//     it('Given token uuid do not belongs to sender wallet, should throw 403', async () => {
//       const fn1 = sinon.stub(Token.prototype, 'belongsTo').resolves(false);
//       await jestExpect(async () => {
//         await wallet.transfer(sender, receiver, [token]);
//       }).rejects.toThrow(/belongs/);
//       fn1.restore();
//     });

//     // it("Claim set to true, should success", async () => {
//     //   const fn0 = sinon.stub(Token.prototype, "belongsTo").resolves(true);
//     //   // const fn1 = sinon.stub(TransferRepository.prototype, "create").resolves({
//     //   //   id: 1,
//     //   //   state: Transfer.STATE.completed,

//     //   // });
//     //   const fn1 = sinon.stub(wallet, "hasTrust").resolves(true);
//     //   const sender = new Wallet(1, session);
//     //   const receiver = new Wallet(2, session);
//     //   const token = new Token({
//     //     id: 1,
//     //     uuid: "uu",
//     //     transfer_pending: false,
//     //   }, session);
//     //   const transfer = await wallet.transfer(sender, receiver, [token], true);
//     //   expect(transfer).property("state").eq(Transfer.STATE.completed);
//     //   fn0.restore();
//     //   fn1.restore();
//     // });

//     it("don't have trust, sender under control, should return transfer with pending state", async () => {
//       sinon.stub(Wallet.prototype, 'isDeduct').resolves(false);
//       const fn3 = sinon.stub(Wallet.prototype, 'hasControlOver');
//       fn3.onFirstCall().resolves(true);
//       fn3.onSecondCall().resolves(false);
//       const fn0 = sinon.stub(Token.prototype, 'belongsTo').resolves(true);
//       sinon.stub(Token.prototype, 'beAbleToTransfer').resolves(true);
//       sinon.stub(TokenService.prototype, 'pendingTransfer');
//       const fn1 = sinon.stub(TransferRepository.prototype, 'create').resolves({
//         id: 1,
//         state: Transfer.STATE.pending,
//       });

//       const fn2 = sinon.stub(sender, 'hasTrust').resolves(false);
//       const transfer = await sender.transfer(sender, receiver, [token], false);
//       expect(transfer).property('state').eq(Transfer.STATE.pending);
//       expect(fn1).to.have.been.calledWith({
//         originator_wallet_id: sender.getId(),
//         source_wallet_id: sender.getId(),
//         destination_wallet_id: receiver.getId(),
//         state: Transfer.STATE.pending,
//         parameters: {
//           tokens: [token.getId()],
//         },
//         claim: false,
//       });
//       fn0.restore();
//       fn1.restore();
//       fn2.restore();
//     });

//     // This shouldn't be able to pass anymore, because this is a deduct case, this case do not support yet, check the test for "deduct"
//     it.skip("don't have trust, receiver under control, should created a transfer request record", async () => {
//       const fn0 = sinon.stub(Token.prototype, 'belongsTo').resolves(true);
//       const fn1 = sinon.stub(TransferRepository.prototype, 'create').resolves({
//         id: 1,
//         state: Transfer.STATE.requested,
//       });

//       const fn2 = sinon.stub(wallet, 'checkTrust').rejects(new HttpError(403));
//       const transfer = await wallet.transfer(sender, receiver, [token], false);
//       expect(transfer).property('state').eq(Transfer.STATE.requested);

//       expect(fn1).to.have.been.calledWith({
//         originator_wallet_id: sender.getId(),
//         source_wallet_id: receiver.getId(),
//         destination_wallet_id: sender.getId(),
//         state: Transfer.STATE.requested,
//         parameters: {
//           tokens: [token.id],
//         },
//         claim: false,
//       });
//       fn0.restore();
//       fn1.restore();
//       fn2.restore();
//     });

//     // This shouldn't be able to pass anymore, because this is a deduct case, this case do not support yet, check the test for "deduct"
//     it.skip('have trust, should finish successfully', async () => {
//       const fn0 = sinon.stub(Token.prototype, 'belongsTo').resolves(true);
//       const fn1 = sinon.stub(wallet, 'checkTrust');
//       const fn2 = sinon.stub(TransferRepository.prototype, 'create');
//       const fn3 = sinon.stub(Token.prototype, 'completeTransfer');
//       await wallet.transfer(sender, receiver, [token]);
//       expect(fn2).calledWith(
//         sinon.match({
//           state: Transfer.STATE.completed,
//         }),
//       );
//       expect(fn3).calledWith();
//       fn0.restore();
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//     });
//   });

//   describe('Bundle transfer', () => {
//     const sender = new Wallet(uuid.v4());
//     const receiver = new Wallet(uuid.v4());
//     const transferId = uuid.v4();

//     it("Sender doesn't have enough tokens to send, should throw 403", async () => {
//       const fn0 = sinon
//         .stub(TokenService.prototype, 'countTokenByWallet')
//         .resolves(1);
//       await jestExpect(async () => {
//         await wallet.transferBundle(sender, receiver, 2);
//       }).rejects.toThrow(/enough/);
//       fn0.restore();
//     });

//     it("don't have trust, sender under control, should created a transfer pending record", async () => {
//       const fn0 = sinon
//         .stub(TokenService.prototype, 'countTokenByWallet')
//         .resolves(1);
//       const fn4 = sinon
//         .stub(TokenService.prototype, 'countNotClaimedTokenByWallet')
//         .resolves(1);
//       const fn1 = sinon.stub(TransferRepository.prototype, 'create').resolves({
//         id: transferId,
//         state: Transfer.STATE.pending,
//       });
//       sinon.stub(Wallet.prototype, 'isDeduct').resolves(false);
//       const fn3 = sinon.stub(Wallet.prototype, 'hasControlOver');
//       fn3.onFirstCall().resolves(true);
//       fn3.onSecondCall().resolves(false);

//       const fn2 = sinon.stub(sender, 'hasTrust').resolves(false);
//       const transfer = await sender.transferBundle(sender, receiver, 1, false);
//       expect(transfer).property('state').eq(Transfer.STATE.pending);
//       expect(fn1).to.have.been.calledWith({
//         originator_wallet_id: sender.getId(),
//         source_wallet_id: sender.getId(),
//         destination_wallet_id: receiver.getId(),
//         state: Transfer.STATE.pending,
//         parameters: {
//           bundle: {
//             bundleSize: 1,
//           },
//         },
//         claim: false,
//       });
//       expect(fn0).calledWith(sender);
//       fn1.restore();
//       fn2.restore();
//       fn4.restore();
//     });

//     it("don't have trust, receiver under control, should create a transfer request record", async () => {
//       const fn0 = sinon
//         .stub(TokenService.prototype, 'countTokenByWallet')
//         .resolves(1);
//       const fn4 = sinon
//         .stub(TokenService.prototype, 'countNotClaimedTokenByWallet')
//         .resolves(1);
//       const fn1 = sinon.stub(TransferRepository.prototype, 'create').resolves({
//         id: transferId,
//         state: Transfer.STATE.requested,
//       });
//       sinon.stub(Wallet.prototype, 'isDeduct').resolves(false);
//       const fn3 = sinon.stub(Wallet.prototype, 'hasControlOver');
//       fn3.onFirstCall().resolves(false);
//       fn3.onSecondCall().resolves(true);

//       const fn2 = sinon.stub(receiver, 'hasTrust').resolves(false);
//       const transfer = await receiver.transferBundle(
//         sender,
//         receiver,
//         1,
//         false,
//       );
//       expect(transfer).property('state').eq(Transfer.STATE.requested);
//       expect(fn1).to.have.been.calledWith({
//         claim: false,
//         originator_wallet_id: receiver.getId(),
//         source_wallet_id: sender.getId(),
//         destination_wallet_id: receiver.getId(),
//         state: Transfer.STATE.requested,
//         parameters: {
//           bundle: {
//             bundleSize: 1,
//           },
//         },
//       });
//       fn0.restore();
//       fn1.restore();
//       fn2.restore();
//       fn4.restore();
//     });

//     it('have trust, not deduct, should finish successfully', async () => {
//       const fn0 = sinon
//         .stub(TokenService.prototype, 'countTokenByWallet')
//         .resolves(1);
//       const fn5 = sinon
//         .stub(TokenService.prototype, 'countNotClaimedTokenByWallet')
//         .resolves(1);
//       const fn1 = sinon.stub(Wallet.prototype, 'hasTrust').resolves(true);
//       sinon.stub(Wallet.prototype, 'isDeduct').resolves(false);
//       const fn2 = sinon.stub(TransferRepository.prototype, 'create');
//       const fn3 = sinon.stub(TokenService.prototype, 'completeTransfer');
//       sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       const fn4 = sinon
//         .stub(TokenService.prototype, 'getTokensByBundle')
//         .resolves([new Token(uuid.v4(), session)]);
//       await wallet.transferBundle(sender, receiver, 1, false);
//       expect(fn2).calledWith(
//         sinon.match({
//           state: Transfer.STATE.completed,
//         }),
//       );

//       expect(fn3).calledWith();
//       fn0.restore();
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//       fn4.restore();
//       fn5.restore();
//     });

//     it('have trust, is deduct, should pending', async () => {
//       const fn0 = sinon
//         .stub(TokenService.prototype, 'countTokenByWallet')
//         .resolves(1);
//       const _fn6 = sinon
//         .stub(TokenService.prototype, 'countNotClaimedTokenByWallet')
//         .resolves(1);
//       const fn1 = sinon.stub(Wallet.prototype, 'hasTrust').resolves(true);
//       sinon.stub(Wallet.prototype, 'isDeduct').resolves(true);
//       const fn2 = sinon.stub(TransferRepository.prototype, 'create');
//       const fn3 = sinon.stub(Token.prototype, 'completeTransfer');
//       const fn4 = sinon
//         .stub(TokenService.prototype, 'getTokensByBundle')
//         .resolves([new Token(uuid.v4(), session)]);
//       const fn5 = sinon.stub(Wallet.prototype, 'hasControlOver');
//       fn5.onCall(0).resolves(false);
//       fn5.onCall(1).resolves(true);
//       await wallet.transferBundle(sender, receiver, 1, false);
//       expect(fn2).calledWith(
//         sinon.match({
//           state: Transfer.STATE.requested,
//         }),
//       );

//       fn0.restore();
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//       fn4.restore();
//     });
//   });

//   describe('getPendingTransfers', () => {
//     it('getPendingTransfers', async () => {
//       const fn1 = sinon
//         .stub(TransferRepository.prototype, 'getPendingTransfers')
//         .resolves([{ id: uuid.v4() }]);
//       const result = await wallet.getPendingTransfers();
//       expect(result).lengthOf(1);
//       fn1.restore();
//     });
//   });

//   describe('acceptTransfer', () => {
//     const receiver = new Wallet(uuid.v4());
//     const token = new Token(
//       {
//         id: uuid.v4(),
//       },
//       session,
//     );
//     const transferId = uuid.v4();

//     it("can not accept transfer who's state isn't pending", async () => {
//       sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: transferId,
//         state: Transfer.STATE.requested,
//       });
//       sinon.stub(TransferRepository.prototype, 'update');
//       sinon
//         .stub(TokenService.prototype, 'getTokensByPendingTransferId')
//         .resolves([token]);
//       sinon.stub(Token.prototype, 'completeTransfer');
//       sinon.stub(WalletService.prototype, 'getById');
//       sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       await jestExpect(async () => {
//         await wallet.acceptTransfer(transferId);
//       }).rejects.toThrow(/pending/);
//     });

//     it('acceptTransfer', async () => {
//       const walletId1 = uuid.v4();
//       const walletId2 = uuid.v4();
//       const fn1 = sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: transferId,
//         state: Transfer.STATE.pending,
//         source_wallet_id: walletId1,
//         destination_wallet_id: walletId2,
//       });
//       const fn2 = sinon.stub(TransferRepository.prototype, 'update');
//       const fn3 = sinon
//         .stub(TokenService.prototype, 'getTokensByPendingTransferId')
//         .resolves([token]);
//       const fn4 = sinon.stub(TokenService.prototype, 'completeTransfer');
//       const fn5 = sinon.stub(WalletService.prototype, 'getById');
//       const fn6 = sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       await wallet.acceptTransfer(transferId);
//       expect(fn2).calledWith(
//         sinon.match({
//           state: Transfer.STATE.completed,
//         }),
//       );
//       expect(fn4).calledWith();
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//       fn4.restore();
//       fn5.restore();
//       fn6.restore();
//     });

//     it('acceptTransfer with bundle', async () => {
//       const fn1 = sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: transferId,
//         source_wallet_id: receiver.getId(),
//         state: Transfer.STATE.pending,
//         parameters: {
//           bundle: {
//             bundleSize: 1,
//           },
//         },
//       });
//       const fn2 = sinon.stub(TransferRepository.prototype, 'update');
//       const fn4 = sinon.stub(TokenService.prototype, 'completeTransfer');
//       const fn5 = sinon
//         .stub(TokenService.prototype, 'getTokensByBundle')
//         .resolves([token]);
//       const fn6 = sinon.stub(WalletService.prototype, 'getById');
//       const fn7 = sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       await receiver.acceptTransfer(transferId);
//       expect(fn2).calledWith(
//         sinon.match({
//           state: Transfer.STATE.completed,
//         }),
//       );
//       expect(fn5).calledWith(sinon.match.any, 1);
//       expect(fn4).calledWith();
//       fn1.restore();
//       fn2.restore();
//       fn4.restore();
//       fn5.restore();
//       fn6.restore();
//       fn7.restore();
//     });
//   });

//   describe('declineTransfer', () => {
//     const wallet = new Wallet(uuid.v4());
//     const sender = new Wallet(uuid.v4());
//     const receiver = new Wallet(uuid.v4());
//     const token = new Token(
//       {
//         id: uuid.v4(),
//       },
//       session,
//     );
//     const transferId = uuid.v4();

//     it('fail to decline if transfer state is neither the pending nor requested', async () => {
//       sinon
//         .stub(TransferRepository.prototype, 'getById')
//         .resolves({ id: transferId });
//       sinon.stub(TransferRepository.prototype, 'update');
//       sinon
//         .stub(TokenService.prototype, 'getTokensByPendingTransferId')
//         .resolves([token.id]);
//       sinon.stub(Token.prototype, 'cancelTransfer');
//       sinon.stub(WalletService.prototype, 'getById');
//       sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       await jestExpect(async () => {
//         await wallet.declineTransfer(transferId);
//       }).rejects.toThrow(/state/);
//     });

//     it("Can decline a 'pending' transfer for a managed wallet", async () => {
//       const fn1 = sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: transferId,
//         state: Transfer.STATE.pending,
//         source_wallet_id: sender.getId(),
//         destination_wallet_id: receiver.getId(),
//       });
//       const fn2 = sinon.stub(TransferRepository.prototype, 'update');
//       const fn3 = sinon
//         .stub(TokenService.prototype, 'getTokensByPendingTransferId')
//         .resolves([token]);
//       const fn4 = sinon.stub(TokenService.prototype, 'cancelTransfer');
//       const fn5 = sinon.stub(WalletService.prototype, 'getById');
//       fn5.onCall(0).resolves(sender);
//       fn5.onCall(1).resolves(receiver);
//       const fn6 = sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       await wallet.declineTransfer(transferId);
//       expect(fn2).calledWith(
//         sinon.match({
//           state: Transfer.STATE.cancelled,
//         }),
//       );
//       expect(fn4).calledWith();
//       expect(fn6).calledWith(receiver);
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//       fn4.restore();
//       fn5.restore();
//       fn6.restore();
//     });

//     it("Can decline a 'requested' transfer for a managed wallet", async () => {
//       const fn1 = sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: transferId,
//         state: Transfer.STATE.requested,
//         source_wallet_id: sender.getId(),
//         destination_wallet_id: receiver.getId(),
//       });
//       const fn2 = sinon.stub(TransferRepository.prototype, 'update');
//       const fn3 = sinon
//         .stub(TokenService.prototype, 'getTokensByPendingTransferId')
//         .resolves([token]);
//       const fn4 = sinon.stub(TokenService.prototype, 'cancelTransfer');
//       const fn5 = sinon.stub(WalletService.prototype, 'getById');
//       fn5.onCall(0).resolves(sender);
//       fn5.onCall(1).resolves(receiver);
//       const fn6 = sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       await wallet.declineTransfer(transferId);
//       expect(fn2).calledWith(
//         sinon.match({
//           state: Transfer.STATE.cancelled,
//         }),
//       );
//       expect(fn4).calledWith();
//       expect(fn6).calledWith(sender);
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//       fn4.restore();
//       fn5.restore();
//       fn6.restore();
//     });
//   });

//   describe('cancelTransfer', () => {
//     const wallet = new Wallet(uuid.v4());
//     const wallet2 = new Wallet(uuid.v4());
//     const wallet3 = new Wallet(uuid.v4());
//     const transferId = uuid.v4();

//     it("Can cancel a 'pending' transfer", async () => {
//       const fn1 = sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: transferId,
//         state: Transfer.STATE.pending,
//         source_wallet_id: wallet2.getId(),
//         destination_wallet_id: wallet3.getId(),
//       });
//       const fn2 = sinon.stub(TransferRepository.prototype, 'update');
//       const fn3 = sinon.stub(WalletService.prototype, 'getById');
//       fn3.onCall(0).resolves(wallet2);
//       fn3.onCall(1).resolves(wallet3);
//       const fn4 = sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       sinon
//         .stub(TokenService.prototype, 'getTokensByPendingTransferId')
//         .resolves([]);
//       sinon.stub(TokenService.prototype, 'cancelTransfer');
//       await wallet.cancelTransfer(transferId);
//       expect(fn2).calledWith(
//         sinon.match({
//           state: Transfer.STATE.cancelled,
//         }),
//       );
//       expect(fn4).calledWith(wallet2);
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//       fn4.restore();
//     });

//     it("Can cancel a 'requested' transfer", async () => {
//       const fn1 = sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: transferId,
//         state: Transfer.STATE.requested,
//         source_wallet_id: wallet2.getId(),
//         destination_wallet_id: wallet3.getId(),
//       });
//       const fn2 = sinon.stub(TransferRepository.prototype, 'update');
//       const fn3 = sinon.stub(WalletService.prototype, 'getById');
//       fn3.onCall(0).resolves(wallet2);
//       fn3.onCall(1).resolves(wallet3);
//       const fn4 = sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       sinon
//         .stub(TokenService.prototype, 'getTokensByPendingTransferId')
//         .resolves([]);
//       sinon.stub(TokenService.prototype, 'cancelTransfer');
//       await wallet.cancelTransfer(1);
//       expect(fn2).calledWith(
//         sinon.match({
//           state: Transfer.STATE.cancelled,
//         }),
//       );
//       expect(fn4).calledWith(wallet3);
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//       fn4.restore();
//     });
//   });

//   describe('fulfillTransfer', () => {
//     const wallet = new Wallet(uuid.v4());
//     const wallet2 = new Wallet(uuid.v4());
//     const transferId = uuid.v4();

//     it('fulfillTransfer successfully', async () => {
//       const fn1 = sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: transferId,
//         source_wallet_id: wallet.getId(),
//         state: Transfer.STATE.requested,
//       });
//       const fn2 = sinon.stub(TransferRepository.prototype, 'update');
//       const fn3 = sinon.stub(WalletService.prototype, 'getById');
//       const fn4 = sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       sinon.stub(TokenService.prototype, 'completeTransfer');
//       sinon
//         .stub(TokenService.prototype, 'getTokensByPendingTransferId')
//         .resolves([]);
//       await wallet.fulfillTransfer(transferId);
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//       fn4.restore();
//     });

//     it("have no control over the transfer's sender , should throw 403 no permission", async () => {
//       const fn1 = sinon.stub(TransferRepository.prototype, 'getById').resolves([
//         {
//           id: transferId,
//           source_wallet_id: wallet2.getId(),
//         },
//       ]);
//       const fn2 = sinon.stub(WalletService.prototype, 'getById');
//       const fn3 = sinon
//         .stub(Wallet.prototype, 'hasControlOver')
//         .resolves(false);
//       await jestExpect(async () => {
//         await wallet.fulfillTransfer(transferId);
//       }).rejects.toThrow(/permission/);
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//     });

//     it("the transfer's state is not requested, should throw 403 forbidden", async () => {
//       const fn1 = sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: transferId,
//         source_wallet_id: wallet.getId(),
//       });
//       const fn2 = sinon.stub(WalletService.prototype, 'getById');
//       const fn3 = sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       await jestExpect(async () => {
//         await wallet.fulfillTransfer(transferId);
//       }).rejects.toThrow(/forbidden/);
//       fn1.restore();
//       fn2.restore();
//       fn3.restore();
//     });
//   });

//   describe('fulfillTransferWithTokens', () => {
//     const wallet = new Wallet(uuid.v4());
//     const token = new Token(
//       {
//         id: uuid.v4(),
//       },
//       session,
//     );
//     const token2 = new Token(
//       {
//         id: uuid.v4(),
//       },
//       session,
//     );
//     const transferId = uuid.v4();

//     it('fulfillTransfer successfully', async () => {
//       sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: 1,
//         source_wallet_id: wallet.getId(),
//         state: Transfer.STATE.requested,
//         parameters: {
//           bundle: {
//             bundleSize: 1,
//           },
//         },
//       });
//       sinon.stub(TransferRepository.prototype, 'update');
//       sinon.stub(WalletService.prototype, 'getById');
//       sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       sinon.stub(Token.prototype, 'toJSON').resolves({ uuid: 'xxx' });
//       sinon.stub(Token.prototype, 'belongsTo').resolves(true);
//       sinon.stub(TokenService.prototype, 'completeTransfer');
//       await wallet.fulfillTransferWithTokens(1, [token]);
//     });

//     it('Should not set tokens for non-bundle case', async () => {
//       sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: 1,
//         source_wallet_id: wallet.getId(),
//         state: Transfer.STATE.requested,
//         parameters: {},
//       });
//       sinon.stub(TransferRepository.prototype, 'update');
//       sinon.stub(WalletService.prototype, 'getById');
//       sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       await jestExpect(async () => {
//         await wallet.fulfillTransferWithTokens(1, [token]);
//       }).rejects.toThrow(/no need/i);
//     });

//     it('Too many tokens', async () => {
//       sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: 1,
//         source_wallet_id: wallet.getId(),
//         state: Transfer.STATE.requested,
//         parameters: {
//           bundle: {
//             bundleSize: 1,
//           },
//         },
//       });
//       sinon.stub(TransferRepository.prototype, 'update');
//       sinon.stub(WalletService.prototype, 'getById');
//       sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       sinon.stub(Token.prototype, 'toJSON').resolves({ uuid: 'xxx' });
//       sinon.stub(Token.prototype, 'belongsTo').resolves(true);
//       sinon.stub(Token.prototype, 'completeTransfer');
//       await jestExpect(async () => {
//         await wallet.fulfillTransferWithTokens(1, [token, token2]);
//       }).rejects.toThrow(/too many/i);
//     });

//     it('Too few tokens', async () => {
//       sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: 1,
//         source_wallet_id: wallet.getId(),
//         state: Transfer.STATE.requested,
//         parameters: {
//           bundle: {
//             bundleSize: 1,
//           },
//         },
//       });
//       sinon.stub(TransferRepository.prototype, 'update');
//       sinon.stub(WalletService.prototype, 'getById');
//       sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       await jestExpect(async () => {
//         await wallet.fulfillTransferWithTokens(1, []);
//       }).rejects.toThrow(/too few/i);
//     });

//     it('Specified token do not belongs to the wallet', async () => {
//       sinon.stub(TransferRepository.prototype, 'getById').resolves({
//         id: transferId,
//         source_wallet_id: wallet.getId(),
//         state: Transfer.STATE.requested,
//         parameters: {
//           bundle: {
//             bundleSize: 1,
//           },
//         },
//       });
//       sinon.stub(TransferRepository.prototype, 'update');
//       sinon.stub(WalletService.prototype, 'getById');
//       sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       sinon.stub(Token.prototype, 'toJSON').resolves({ uuid: 'xxx' });
//       sinon.stub(Token.prototype, 'belongsTo').resolves(false);
//       await jestExpect(async () => {
//         await wallet.fulfillTransferWithTokens(transferId, [token]);
//       }).rejects.toThrow(/belongs to/i);
//     });
//   });

//   describe('getTransfers', () => {
//     const wallet = new Wallet(uuid.v4());
//     const wallet2 = new Wallet(uuid.v4());
//     const transferId = uuid.v4();

//     it('getTransfers', async () => {
//       const fn1 = sinon
//         .stub(TransferRepository.prototype, 'getByFilter')
//         .resolves([{ id: transferId }]);
//       const result = await wallet.getTransfers(
//         Transfer.STATE.requested,
//         wallet2,
//       );
//       expect(result).lengthOf(1);
//       expect(fn1).calledWith({
//         and: [
//           {
//             or: [
//               {
//                 source_wallet_id: wallet.getId(),
//               },
//               {
//                 destination_wallet_id: wallet.getId(),
//               },
//               {
//                 originator_wallet_id: wallet.getId(),
//               },
//             ],
//           },
//           {
//             state: Transfer.STATE.requested,
//           },
//           {
//             or: [
//               {
//                 source_wallet_id: wallet2.getId(),
//               },
//               {
//                 destination_wallet_id: wallet2.getId(),
//               },
//               {
//                 originator_wallet_id: wallet2.getId(),
//               },
//             ],
//           },
//         ],
//       });
//       fn1.restore();
//     });
//   });

//   describe('hasControlOver', () => {
//     const wallet = new Wallet(uuid.v4());
//     const wallet2 = new Wallet(uuid.v4());

//     it('hasControlOver should pass if it is the same wallet', async () => {
//       const result = await wallet.hasControlOver(wallet);
//       expect(result).eq(true);
//     });

//     it('hasControlOver should pass if manage/yield trust exists', async () => {
//       const fn = sinon
//         .stub(TrustRepository.prototype, 'getByFilter')
//         .resolves([{}]);
//       const result = await wallet.hasControlOver(wallet2);
//       expect(result).eq(true);
//       expect(fn).calledWith({
//         or: [
//           {
//             and: [
//               {
//                 actor_wallet_id: wallet.getId(),
//               },
//               {
//                 request_type:
//                   TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
//               },
//               {
//                 target_wallet_id: wallet2.getId(),
//               },
//               {
//                 state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
//               },
//             ],
//           },
//           {
//             and: [
//               {
//                 actor_wallet_id: wallet2.getId(),
//               },
//               {
//                 request_type:
//                   TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
//               },
//               {
//                 target_wallet_id: wallet.getId(),
//               },
//               {
//                 state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
//               },
//             ],
//           },
//         ],
//       });
//     });
//   });

//   describe('getTrustRelationships', () => {
//     const wallet = new Wallet(uuid.v4());
//     const trustId = uuid.v4();

//     it('successfully', async () => {
//       const fn = sinon
//         .stub(TrustRepository.prototype, 'getByFilter')
//         .resolves([{ id: trustId }]);
//       const result = await wallet.getTrustRelationships(
//         TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
//         TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//       );
//       expect(result).lengthOf(1);
//       expect(fn).calledWith({
//         and: [
//           {
//             state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
//           },
//           {
//             type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//           },
//           {
//             request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//           },
//           {
//             or: [
//               {
//                 actor_wallet_id: wallet.getId(),
//               },
//               {
//                 target_wallet_id: wallet.getId(),
//               },
//               {
//                 originator_wallet_id: wallet.getId(),
//               },
//             ],
//           },
//         ],
//       });
//       fn.restore();
//     });

//     it('without filters', async () => {
//       const fn = sinon
//         .stub(TrustRepository.prototype, 'getByFilter')
//         .resolves([{ id: trustId }]);
//       const result = await wallet.getTrustRelationships();
//       expect(result).lengthOf(1);
//       expect(fn).calledWith({
//         and: [
//           {
//             or: [
//               {
//                 actor_wallet_id: wallet.getId(),
//               },
//               {
//                 target_wallet_id: wallet.getId(),
//               },
//               {
//                 originator_wallet_id: wallet.getId(),
//               },
//             ],
//           },
//         ],
//       });
//       fn.restore();
//     });
//   });

//   describe('Deduct', () => {
//     const wallet = new Wallet({ id: uuid.v4() }); // TODO: should create class MockWallet that does not use repository
//     const sender = new Wallet(uuid.v4());
//     const receiver = new Wallet(uuid.v4());

//     it('the sender is me, should return false', async () => {
//       const result = await wallet.isDeduct(wallet, receiver);
//       expect(result).eq(false);
//     });

//     it('The sender is my sub wallet, should return false', async () => {
//       sinon.stub(Wallet.prototype, 'hasControlOver').resolves(true);
//       const result = await wallet.isDeduct(sender, receiver);
//       expect(result).eq(false);
//     });

//     // TODO: deduction is not supported yet
//     it.skip("The sender isn't my sub wallet, should throw 403", async () => {
//       sinon.stub(Wallet.prototype, 'hasControlOver').resolves(false);
//       const result = await wallet.isDeduct(sender, receiver);
//       expect(result).eq(true);
//     });
//   });

//   describe('getSubWallet', () => {
//     const wallet = new Wallet(uuid.v4());
//     const subWallet = new Wallet(uuid.v4());

//     it('get sub wallet successfully', async () => {
//       sinon.stub(Wallet.prototype, 'getTrustRelationships').resolves([
//         {
//           actor_wallet_id: wallet.getId(),
//           target_wallet_id: subWallet.getId(),
//           request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
//           state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
//         },
//       ]);
//       sinon.stub(WalletService.prototype, 'getById').resolves(subWallet);
//       const wallets = await wallet.getSubWallets();
//       expect(wallets).lengthOf(1);
//     });

//     it('get sub wallet which is state of yield', async () => {
//       sinon.stub(Wallet.prototype, 'getTrustRelationships').resolves([
//         {
//           actor_wallet_id: subWallet.getId(),
//           target_wallet_id: wallet.getId(),
//           request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
//           state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
//         },
//       ]);
//       sinon.stub(WalletService.prototype, 'getById').resolves(subWallet);
//       const wallets = await wallet.getSubWallets();
//       expect(wallets).lengthOf(1);
//     });
//   });

//   describe('getTrustRelationshipsRequestedToMe', () => {
//     const wallet = new Wallet(uuid.v4());
//     const subWallet = new Wallet(uuid.v4());
//     const wallet2 = new Wallet(uuid.v4());

//     it('get one', async () => {
//       sinon.stub(Wallet.prototype, 'getSubWallets').resolves([]);
//       sinon.stub(Wallet.prototype, 'getTrustRelationships').resolves([
//         {
//           actor_wallet_id: wallet2.getId(),
//           target_wallet_id: wallet.getId(),
//           request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//         },
//       ]);
//       const list = await wallet.getTrustRelationshipsRequestedToMe();
//       expect(list).lengthOf(1);
//     });

//     it('get one requested to my sub wallet', async () => {
//       sinon.stub(Wallet.prototype, 'getSubWallets').resolves([subWallet]);
//       const fn = sinon.stub(Wallet.prototype, 'getTrustRelationships');
//       fn.onCall(0).resolves([
//         {
//           actor_wallet_id: wallet2.getId(),
//           target_wallet_id: wallet.getId(),
//           request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//         },
//       ]);
//       fn.onCall(1).resolves([
//         {
//           actor_wallet_id: wallet2.getId(),
//           target_wallet_id: subWallet.getId(),
//           request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//         },
//       ]);
//       const list = await wallet.getTrustRelationshipsRequestedToMe();
//       expect(list).lengthOf(2);
//     });
//   });

//   describe('checkManageRecycle', () => {
//     const walletA = new Wallet(uuid.v4());
//     const walletB = new Wallet(uuid.v4());
//     const trustIdA = uuid.v4();
//     const trustIdB = uuid.v4();

//     it('A manage B, now B request to manage A, should throw error', async () => {
//       const trustRelationshipTrusted = {
//         id: trustIdA,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
//         actor_wallet_id: walletA.getId(),
//         target_wallet_id: walletB.getId(),
//       };
//       const trustRelationshipRequested = {
//         id: trustIdB,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
//         actor_wallet_id: walletB.getId(),
//         target_wallet_id: walletA.getId(),
//       };
//       sinon
//         .stub(Wallet.prototype, 'getTrustRelationshipsTrusted')
//         .resolves([trustRelationshipTrusted]);
//       await jestExpect(async () => {
//         await walletA.checkManageCircle(trustRelationshipRequested);
//       }).rejects.toThrow(/circle/);
//     });

//     it('A manage B, now A request to yield B, should throw error', async () => {
//       const trustRelationshipTrusted = {
//         id: trustIdA,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
//         actor_wallet_id: walletA.getId(),
//         target_wallet_id: walletB.getId(),
//       };
//       const trustRelationshipRequested = {
//         id: trustIdB,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
//         actor_wallet_id: walletA.getId(),
//         target_wallet_id: walletB.getId(),
//       };
//       sinon
//         .stub(Wallet.prototype, 'getTrustRelationshipsTrusted')
//         .resolves([trustRelationshipTrusted]);
//       await jestExpect(async () => {
//         await walletA.checkManageCircle(trustRelationshipRequested);
//       }).rejects.toThrow(/circle/);
//     });

//     it('A yield B, now B request to yield A, should throw error', async () => {
//       const trustRelationshipTrusted = {
//         id: trustIdA,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
//         actor_wallet_id: walletA.getId(),
//         target_wallet_id: walletB.getId(),
//       };
//       const trustRelationshipRequested = {
//         id: trustIdB,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
//         actor_wallet_id: walletB.getId(),
//         target_wallet_id: walletA.getId(),
//       };
//       sinon
//         .stub(Wallet.prototype, 'getTrustRelationshipsTrusted')
//         .resolves([trustRelationshipTrusted]);
//       await jestExpect(async () => {
//         await walletA.checkManageCircle(trustRelationshipRequested);
//       }).rejects.toThrow(/circle/);
//     });

//     it('A yield B, now A request to manage B, should throw error', async () => {
//       const trustRelationshipTrusted = {
//         id: trustIdA,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
//         actor_wallet_id: walletA.getId(),
//         target_wallet_id: walletB.getId(),
//       };
//       const trustRelationshipRequested = {
//         id: trustIdB,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
//         actor_wallet_id: walletA.getId(),
//         target_wallet_id: walletB.getId(),
//       };
//       sinon
//         .stub(Wallet.prototype, 'getTrustRelationshipsTrusted')
//         .resolves([trustRelationshipTrusted]);
//       await jestExpect(async () => {
//         await walletA.checkManageCircle(trustRelationshipRequested);
//       }).rejects.toThrow(/circle/);
//     });
//   });

//   describe('checkDuplicateRequest', () => {
//     const walletA = new Wallet(uuid.v4());
//     const walletB = new Wallet(uuid.v4());
//     const trustIdA = uuid.v4();
//     const trustIdB = uuid.v4();

//     it('A send B trust has been requested, now request again, should throw error', async () => {
//       const trustRelationshipRequested = {
//         id: trustIdA,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//         actor_wallet_id: walletA.getId(),
//         target_wallet_id: walletB.getId(),
//         state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
//       };
//       const trustRelationshipRequesting = {
//         id: trustIdB,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//         actor_wallet_id: walletA.getId(),
//         target_wallet_id: walletB.getId(),
//         state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
//       };
//       sinon
//         .stub(Wallet.prototype, 'getTrustRelationships')
//         .resolves([trustRelationshipRequested]);
//       await jestExpect(async () => {
//         await wallet.checkDuplicateRequest(trustRelationshipRequesting);
//       }).rejects.toThrow(/has been/);
//     });

//     it('A send B trust has been trusted, now request B receive A, should throw error', async () => {
//       const trustRelationshipRequested = {
//         id: trustIdA,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         actor_wallet_id: walletA.getId(),
//         target_wallet_id: walletB.getId(),
//         state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
//       };
//       const trustRelationshipRequesting = {
//         id: trustIdB,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.receive,
//         actor_wallet_id: walletB.getId(),
//         target_wallet_id: walletA.getId(),
//         state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
//       };
//       sinon
//         .stub(Wallet.prototype, 'getTrustRelationships')
//         .resolves([trustRelationshipRequested]);
//       await jestExpect(async () => {
//         await wallet.checkDuplicateRequest(trustRelationshipRequesting);
//       }).rejects.toThrow(/has been/);
//     });

//     it('A manage B trust has been requested, now request B yield A, should throw error', async () => {
//       const trustRelationshipRequested = {
//         id: trustIdA,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
//         actor_wallet_id: walletA.getId(),
//         target_wallet_id: walletB.getId(),
//         state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
//       };
//       const trustRelationshipRequesting = {
//         id: trustIdB,
//         type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
//         request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
//         actor_wallet_id: walletB.getId(),
//         target_wallet_id: walletA.getId(),
//         state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
//       };
//       sinon
//         .stub(Wallet.prototype, 'getTrustRelationships')
//         .resolves([trustRelationshipRequested]);
//       await jestExpect(async () => {
//         await wallet.checkDuplicateRequest(trustRelationshipRequesting);
//       }).rejects.toThrow(/has been/);
//     });
//   });

//   describe('getTransferById', () => {
//     const transferId = uuid.v4();

//     it('Successfully', async () => {
//       sinon.stub(Wallet.prototype, 'getTransfers').resolves([
//         {
//           id: transferId,
//         },
//       ]);
//       const transfer = await wallet.getTransferById(transferId);
//       expect(transfer).property('id').eq(transferId);
//     });

//     it('Not fond', async () => {
//       sinon.stub(Wallet.prototype, 'getTransfers').resolves([]);
//       await jestExpect(async () => {
//         await wallet.getTransferById(1);
//       }).rejects.toThrow(/not find/);
//     });
//   });

//   describe('getTokensByTransferId', () => {
//     const token = new Token(uuid.v4());
//     const transferId = uuid.v4();

//     it('Completed transfer', async () => {
//       const transfer = {
//         id: transferId,
//         state: Transfer.STATE.completed,
//       };
//       sinon.stub(Wallet.prototype, 'getTransferById').resolves(transfer);
//       const fn = sinon
//         .stub(TokenService.prototype, 'getTokensByTransferId')
//         .resolves([token]);
//       const tokens = await wallet.getTokensByTransferId(transferId);
//       expect(tokens).lengthOf(1);
//       expect(fn).calledWith(transferId);
//     });

//     it('Pending/requested transfer', async () => {
//       const transfer = {
//         id: transferId,
//         state: Transfer.STATE.pending,
//       };
//       sinon.stub(Wallet.prototype, 'getTransferById').resolves(transfer);
//       const fn = sinon
//         .stub(TokenService.prototype, 'getTokensByPendingTransferId')
//         .resolves([token]);
//       const tokens = await wallet.getTokensByTransferId(transferId);
//       expect(tokens).lengthOf(1);
//       expect(fn).calledWith(transferId);
//     });
//   });
// });
