const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const { v4: uuid } = require('uuid');
const Wallet = require('./Wallet');
const Trust = require('./Trust');
const Transfer = require('./Transfer');

chai.use(sinonChai);
const { expect } = chai;
const TransferRepository = require('../repositories/TransferRepository');
const Session = require('../infra/database/Session');
const TrustRelationshipEnums = require('../utils/trust-enums');
const Token = require('./Token');
const TransferEnums = require('../utils/transfer-enum');

describe('Transfer Model', () => {
  let transferModel;
  let transferRepositoryStub;

  beforeEach(() => {
    const session = new Session();
    transferModel = new Transfer(session);
    transferRepositoryStub = sinon.stub(TransferRepository.prototype);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('removeWalletIds', () => {
    const transferId = uuid();
    const transferObject = {
      id: transferId,
      originator_wallet_id: uuid(),
      source_wallet_id: uuid(),
      destination_wallet_id: uuid(),
    };
    const newObject = Transfer.removeWalletIds(transferObject);
    expect(newObject).eql({ id: transferId });
  });

  it('getByFilter', async () => {
    const transferId = uuid();
    transferRepositoryStub.getByFilter.resolves({result:[{id: transferId}], count: 1});

    const result = await transferModel.getByFilter('filter', 'limitOptions');
    expect(result).eql({transfers :[{id: transferId}], count: 1});
    expect(transferRepositoryStub.getByFilter).calledOnceWithExactly(
      'filter',
      'limitOptions',
    );
  });

  it('getById', async () => {
    const transferId = uuid();
    const walletLoginId = uuid();
    const getTransfersStub = sinon
      .stub(Transfer.prototype, 'getTransfers')
      .resolves({transfers: [{id: transferId, walletLoginId}]});

    const result = await transferModel.getById({ transferId, walletLoginId });

    expect(result).eql({ id: transferId, walletLoginId });
    expect(getTransfersStub).calledOnceWithExactly({
      transferId,
      walletLoginId,
    });
  });

  it('update', async () => {
    const transferId = uuid();
    transferRepositoryStub.update.resolves({
      id: transferId,
      originator_wallet_id: uuid(),
    });

    const result = await transferModel.update({ transferId, update: 'yes' });

    expect(result).eql({ id: transferId });
    expect(transferRepositoryStub.update).calledOnceWithExactly({
      transferId,
      update: 'yes',
    });
  });

  it('create', async () => {
    const transferId = uuid();
    transferRepositoryStub.create.resolves({
      id: transferId,
      originator_wallet_id: uuid(),
      source_wallet_id: uuid(),
    });

    const result = await transferModel.create({ transferId, create: 'yes' });

    expect(result).eql({ id: transferId });
    expect(transferRepositoryStub.create).calledOnceWithExactly({
      transferId,
      create: 'yes',
    });
  });

  it('create', async () => {
    const transferId = uuid();
    transferRepositoryStub.create.resolves({
      id: transferId,
      originator_wallet_id: uuid(),
      source_wallet_id: uuid(),
    });

    const result = await transferModel.create({ transferId, create: 'yes' });

    expect(result).eql({ id: transferId });
    expect(transferRepositoryStub.create).calledOnceWithExactly({
      transferId,
      create: 'yes',
    });
  });

  it('getTransfers', async () => {
    const transferId = uuid();
    const walletLoginId = uuid();
    const state = uuid();
    const walletId = uuid();

    const getByFilterStub = sinon
      .stub(Transfer.prototype, 'getByFilter')
      .resolves({transfers:[{id: transferId}]});

    const result = await transferModel.getTransfers({
      transferId,
      walletLoginId,
      limit: 10,
      offset: 0,
      state,
      walletId,
    });

    expect(result).eql({transfers:[{id: transferId}]});
    expect(getByFilterStub).calledOnceWithExactly(
      {
        and: [
          {
            or: [
              { source_wallet_id: walletLoginId },
              { destination_wallet_id: walletLoginId },
              { originator_wallet_id: walletLoginId },
            ],
          },
          { state },
          {
            or: [
              { source_wallet_id: walletId },
              { destination_wallet_id: walletId },
              { originator_wallet_id: walletId },
            ],
          },
          { 'transfer.id': transferId },
        ],
      },
      { limit: 10, offset: 0 },
    );
  });

  describe('isDeduct', () => {
    let hasControlOverStub;

    beforeEach(() => {
      hasControlOverStub = sinon.stub(Wallet.prototype, 'hasControlOver');
    });

    it('should return false -- parent = sender.id', async () => {
      const parentId = uuid();
      const result = await transferModel.isDeduct(parentId, { id: parentId });

      expect(result).eql(false);
      expect(hasControlOverStub).not.called;
    });

    it('should return false -- hasControlOver returns true', async () => {
      const parentId = uuid();
      const id = uuid();
      hasControlOverStub.resolves(true);
      const result = await transferModel.isDeduct(parentId, { id });

      expect(result).eql(false);
      expect(hasControlOverStub).calledOnceWithExactly(parentId, id);
    });

    it('should return true', async () => {
      const parentId = uuid();
      const id = uuid();
      hasControlOverStub.resolves(false);
      const result = await transferModel.isDeduct(parentId, { id });

      expect(result).eql(true);
      expect(hasControlOverStub).calledOnceWithExactly(parentId, id);
    });
  });

  describe('transfer', () => {
    let isDeductStub;
    let hasTrustStub;
    let hasControlOverStub;
    let transferCreateStub;
    let completeTransferStub;
    let pendingTransferStub;

    beforeEach(() => {
      isDeductStub = sinon.stub(Transfer.prototype, 'isDeduct');
      hasTrustStub = sinon.stub(Trust.prototype, 'hasTrust');
      hasControlOverStub = sinon.stub(Wallet.prototype, 'hasControlOver');
      transferCreateStub = sinon.stub(Transfer.prototype, 'create');
      completeTransferStub = sinon.stub(Token.prototype, 'completeTransfer');
      pendingTransferStub = sinon.stub(Token.prototype, 'pendingTransfer');
    });

    it('should error out -- all tokens do not belong to sender wallet', async () => {
      const tokenId1 = uuid();
      const tokenId2 = uuid();
      const senderId = uuid();
      const tokens = [
        { id: tokenId1, wallet_id: senderId, transfer_pending: false },
        { id: tokenId2, wallet_id: uuid(), transfer_pending: false },
      ];
      let error;
      try {
        await transferModel.transfer(
          'walletLoginId',
          { id: senderId },
          'receiver',
          tokens,
          true,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(403);
      expect(error.message).eql(
        `The token ${tokenId2} does not belong to the sender wallet`,
      );
      expect(isDeductStub).not.called;
      expect(hasTrustStub).not.called;
      expect(hasControlOverStub).not.called;
      expect(transferCreateStub).not.called;
      expect(completeTransferStub).not.called;
      expect(pendingTransferStub).not.called;
    });

    it('should error out -- all tokens cannot be transferred', async () => {
      const tokenId1 = uuid();
      const tokenId2 = uuid();
      const senderId = uuid();
      const tokens = [
        { id: tokenId1, wallet_id: senderId, transfer_pending: false },
        { id: tokenId2, wallet_id: senderId, transfer_pending: true },
      ];
      let error;
      try {
        await transferModel.transfer(
          'walletLoginId',
          { id: senderId },
          'receiver',
          tokens,
          true,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(403);
      expect(error.message).eql(
        `The token ${tokenId2} cannot be transferred for some reason--for example, it is part of another pending transfer`,
      );
      expect(isDeductStub).not.called;
      expect(hasTrustStub).not.called;
      expect(hasControlOverStub).not.called;
      expect(transferCreateStub).not.called;
      expect(completeTransferStub).not.called;
      expect(pendingTransferStub).not.called;
    });

    it('should error out -- all are not claimed', async () => {
      const tokenId1 = uuid();
      const tokenId2 = uuid();
      const senderId = uuid();
      const tokens = [
        {
          id: tokenId1,
          wallet_id: senderId,
          transfer_pending: false,
          claim: false,
        },
        {
          id: tokenId2,
          wallet_id: senderId,
          transfer_pending: true,
          claim: true,
        },
      ];
      let error;
      try {
        await transferModel.transfer(
          'walletLoginId',
          { id: senderId },
          'receiver',
          tokens,
          true,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(403);
      expect(error.message).eql(
        `The token ${tokenId2} cannot be transferred for some reason--for example, it is part of another pending transfer`,
      );
      expect(isDeductStub).not.called;
      expect(hasTrustStub).not.called;
      expect(hasControlOverStub).not.called;
      expect(transferCreateStub).not.called;
      expect(completeTransferStub).not.called;
      expect(pendingTransferStub).not.called;
    });

    describe('walletloginid has control over sender and receiver or isDeduct is false and hasTrust is true', () => {
      it('should complete transfer', async () => {
        const tokenId1 = uuid();
        const tokenId2 = uuid();
        const senderId = uuid();
        const receiverId = uuid();
        const walletLoginId = uuid();
        const transferId = uuid();

        const tokens = [
          {
            id: tokenId1,
            wallet_id: senderId,
            transfer_pending: false,
            claim: false,
          },
          {
            id: tokenId2,
            wallet_id: senderId,
            transfer_pending: false,
            claim: false,
          },
        ];
        hasControlOverStub.onCall(0).resolves(true);
        hasControlOverStub.onCall(1).resolves(true);
        isDeductStub.resolves(true);
        hasTrustStub.resolves(true);
        const transferResult = {
          id: transferId,
          originator_wallet_id: walletLoginId,
          source_wallet_id: senderId,
        };
        transferCreateStub.resolves(transferResult);

        const result = await transferModel.transfer(
          walletLoginId,
          { id: senderId },
          { id: receiverId },
          tokens,
          true,
        );

        expect(result).eql({ id: transferId });
        expect(isDeductStub).calledOnceWithExactly(walletLoginId, {
          id: senderId,
        });
        expect(hasTrustStub).calledOnceWithExactly(
          walletLoginId,
          TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
          { id: senderId },
          { id: receiverId },
        );
        expect(hasControlOverStub.getCall(0).args).eql([
          walletLoginId,
          senderId,
        ]);
        expect(hasControlOverStub.getCall(1).args).eql([
          walletLoginId,
          receiverId,
        ]);
        expect(transferCreateStub).calledOnceWithExactly({
          originator_wallet_id: walletLoginId,
          source_wallet_id: senderId,
          destination_wallet_id: receiverId,
          state: TransferEnums.STATE.completed,
          parameters: {
            tokens: [tokenId1, tokenId2],
          },
          claim: true,
        });
        expect(completeTransferStub).calledOnceWithExactly(
          tokens,
          transferResult,
          true,
        );
        expect(pendingTransferStub).not.called;
      });
    });

    it('should create transfer -- hasControlOverSender', async () => {
      const tokenId1 = uuid();
      const tokenId2 = uuid();
      const senderId = uuid();
      const receiverId = uuid();
      const walletLoginId = uuid();
      const transferId = uuid();

      const tokens = [
        {
          id: tokenId1,
          wallet_id: senderId,
          transfer_pending: false,
          claim: false,
        },
        {
          id: tokenId2,
          wallet_id: senderId,
          transfer_pending: false,
          claim: false,
        },
      ];
      hasControlOverStub.onCall(0).resolves(true);
      hasControlOverStub.onCall(1).resolves(false);
      isDeductStub.resolves(true);
      hasTrustStub.resolves(true);
      const transferResult = {
        id: transferId,
        originator_wallet_id: walletLoginId,
        source_wallet_id: senderId,
      };
      transferCreateStub.resolves(transferResult);

      const result = await transferModel.transfer(
        walletLoginId,
        { id: senderId },
        { id: receiverId },
        tokens,
        true,
      );

      expect(result).eql({ id: transferId });
      expect(isDeductStub).calledOnceWithExactly(walletLoginId, {
        id: senderId,
      });
      expect(hasTrustStub).calledOnceWithExactly(
        walletLoginId,
        TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
        { id: senderId },
        { id: receiverId },
      );
      expect(hasControlOverStub.getCall(0).args).eql([walletLoginId, senderId]);
      expect(hasControlOverStub.getCall(1).args).eql([
        walletLoginId,
        receiverId,
      ]);
      expect(transferCreateStub).calledOnceWithExactly({
        originator_wallet_id: walletLoginId,
        source_wallet_id: senderId,
        destination_wallet_id: receiverId,
        state: TransferEnums.STATE.pending,
        parameters: {
          tokens: [tokenId1, tokenId2],
        },
        claim: true,
      });
      expect(completeTransferStub).not.called;
      expect(pendingTransferStub).calledOnceWithExactly(tokens, transferResult);
    });

    it('should create transfer -- hasControlOverReceiver', async () => {
      const tokenId1 = uuid();
      const tokenId2 = uuid();
      const senderId = uuid();
      const receiverId = uuid();
      const walletLoginId = uuid();
      const transferId = uuid();

      const tokens = [
        {
          id: tokenId1,
          wallet_id: senderId,
          transfer_pending: false,
          claim: false,
        },
        {
          id: tokenId2,
          wallet_id: senderId,
          transfer_pending: false,
          claim: false,
        },
      ];
      hasControlOverStub.onCall(0).resolves(false);
      hasControlOverStub.onCall(1).resolves(true);
      isDeductStub.resolves(true);
      hasTrustStub.resolves(true);
      const transferResult = {
        id: transferId,
        originator_wallet_id: walletLoginId,
        source_wallet_id: senderId,
      };
      transferCreateStub.resolves(transferResult);

      const result = await transferModel.transfer(
        walletLoginId,
        { id: senderId },
        { id: receiverId },
        tokens,
        true,
      );

      expect(result).eql({ id: transferId });
      expect(isDeductStub).calledOnceWithExactly(walletLoginId, {
        id: senderId,
      });
      expect(hasTrustStub).calledOnceWithExactly(
        walletLoginId,
        TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
        { id: senderId },
        { id: receiverId },
      );
      expect(hasControlOverStub.getCall(0).args).eql([walletLoginId, senderId]);
      expect(hasControlOverStub.getCall(1).args).eql([
        walletLoginId,
        receiverId,
      ]);
      expect(transferCreateStub).calledOnceWithExactly({
        originator_wallet_id: walletLoginId,
        source_wallet_id: senderId,
        destination_wallet_id: receiverId,
        state: TransferEnums.STATE.requested,
        parameters: {
          tokens: [tokenId1, tokenId2],
        },
        claim: true,
      });
      expect(completeTransferStub).not.called;
      expect(pendingTransferStub).calledOnceWithExactly(tokens, transferResult);
    });
  });

  describe('transferBundle', () => {
    let isDeductStub;
    let hasTrustStub;
    let hasControlOverStub;
    let transferCreateStub;
    let completeTransferStub;
    let getTokensByBundleStub;
    let countNotClaimedTokenByWalletStub;

    beforeEach(() => {
      isDeductStub = sinon.stub(Transfer.prototype, 'isDeduct');
      hasTrustStub = sinon.stub(Trust.prototype, 'hasTrust');
      hasControlOverStub = sinon.stub(Wallet.prototype, 'hasControlOver');
      transferCreateStub = sinon.stub(Transfer.prototype, 'create');
      completeTransferStub = sinon.stub(Token.prototype, 'completeTransfer');
      getTokensByBundleStub = sinon.stub(Token.prototype, 'getTokensByBundle');
      countNotClaimedTokenByWalletStub = sinon.stub(
        Token.prototype,
        'countNotClaimedTokenByWallet',
      );
    });

    it('should error out -- does not have enough tokens to send', async () => {
      const bundleSize = 3;
      const senderId = uuid();
      let error;
      countNotClaimedTokenByWalletStub.resolves(2);
      try {
        await transferModel.transferBundle(
          'walletLoginId',
          { id: senderId },
          'receiver',
          bundleSize,
          true,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(409);
      expect(error.message).eql(`Do not have enough tokens to send`);
      expect(isDeductStub).not.called;
      expect(hasTrustStub).not.called;
      expect(hasControlOverStub).not.called;
      expect(transferCreateStub).not.called;
      expect(completeTransferStub).not.called;
      expect(getTokensByBundleStub).not.called;
      expect(countNotClaimedTokenByWalletStub).calledOnceWithExactly(senderId);
    });

    describe('walletloginid has control over sender and receiver or isDeduct is false and hasTrust is true', () => {
      it('should complete transfer', async () => {
        const bundleSize = 3;
        const senderId = uuid();
        const receiverId = uuid();
        const walletLoginId = uuid();
        const transferId = uuid();
        const transferResult = {
          id: transferId,
          originator_wallet_id: walletLoginId,
          source_wallet_id: senderId,
        };
        transferRepositoryStub.create.resolves(transferResult);

        hasControlOverStub.onCall(0).resolves(true);
        hasControlOverStub.onCall(1).resolves(true);
        isDeductStub.resolves(true);
        hasTrustStub.resolves(true);

        const tokens = [{ id: uuid() }, { id: uuid() }];
        getTokensByBundleStub.resolves(tokens);

        const result = await transferModel.transferBundle(
          walletLoginId,
          { id: senderId },
          { id: receiverId },
          bundleSize,
          true,
        );

        expect(countNotClaimedTokenByWalletStub).calledOnceWithExactly(
          senderId,
        );
        expect(result).eql({ id: transferId });
        expect(isDeductStub).calledOnceWithExactly(walletLoginId, {
          id: senderId,
        });
        expect(hasTrustStub).calledOnceWithExactly(
          walletLoginId,
          TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
          { id: senderId },
          { id: receiverId },
        );
        expect(hasControlOverStub.getCall(0).args).eql([
          walletLoginId,
          senderId,
        ]);
        expect(hasControlOverStub.getCall(1).args).eql([
          walletLoginId,
          receiverId,
        ]);
        expect(transferRepositoryStub.create).calledOnceWithExactly({
          originator_wallet_id: walletLoginId,
          source_wallet_id: senderId,
          destination_wallet_id: receiverId,
          state: TransferEnums.STATE.completed,
          parameters: {
            bundle: {
              bundleSize,
            },
          },
          claim: true,
        });
        expect(getTokensByBundleStub).calledOnceWithExactly(
          senderId,
          bundleSize,
          true,
        );
        expect(completeTransferStub).calledOnceWithExactly(
          tokens,
          transferResult,
          true,
        );
      });
    });

    it('should create transfer -- hasControlOverSender', async () => {
      const bundleSize = 3;
      const senderId = uuid();
      const receiverId = uuid();
      const walletLoginId = uuid();
      const transferId = uuid();

      hasControlOverStub.onCall(0).resolves(true);
      hasControlOverStub.onCall(1).resolves(false);
      isDeductStub.resolves(true);
      hasTrustStub.resolves(true);
      const transferResult = {
        id: transferId,
        originator_wallet_id: walletLoginId,
        source_wallet_id: senderId,
      };
      transferCreateStub.resolves(transferResult);
      const tokens = [{ id: uuid() }, { id: uuid() }];
      getTokensByBundleStub.resolves(tokens);

      const result = await transferModel.transferBundle(
        walletLoginId,
        { id: senderId },
        { id: receiverId },
        bundleSize,
        true,
      );

      expect(countNotClaimedTokenByWalletStub).calledOnceWithExactly(senderId);
      expect(result).eql({ id: transferId });
      expect(isDeductStub).calledOnceWithExactly(walletLoginId, {
        id: senderId,
      });
      expect(hasTrustStub).calledOnceWithExactly(
        walletLoginId,
        TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
        { id: senderId },
        { id: receiverId },
      );
      expect(hasControlOverStub.getCall(0).args).eql([walletLoginId, senderId]);
      expect(hasControlOverStub.getCall(1).args).eql([
        walletLoginId,
        receiverId,
      ]);
      expect(transferCreateStub).calledOnceWithExactly({
        originator_wallet_id: walletLoginId,
        source_wallet_id: senderId,
        destination_wallet_id: receiverId,
        state: TransferEnums.STATE.pending,
        parameters: {
          bundle: {
            bundleSize,
          },
        },
        claim: true,
      });
      expect(getTokensByBundleStub).not.called;
      expect(completeTransferStub).not.called;
    });

    it('should create transfer -- hasControlOverReceiver', async () => {
      const bundleSize = 3;
      const senderId = uuid();
      const receiverId = uuid();
      const walletLoginId = uuid();
      const transferId = uuid();

      hasControlOverStub.onCall(0).resolves(false);
      hasControlOverStub.onCall(1).resolves(true);
      isDeductStub.resolves(true);
      hasTrustStub.resolves(true);
      const transferResult = {
        id: transferId,
        originator_wallet_id: walletLoginId,
        source_wallet_id: senderId,
      };
      transferCreateStub.resolves(transferResult);
      const tokens = [{ id: uuid() }, { id: uuid() }];
      getTokensByBundleStub.resolves(tokens);

      const result = await transferModel.transferBundle(
        walletLoginId,
        { id: senderId },
        { id: receiverId },
        bundleSize,
        true,
      );

      expect(countNotClaimedTokenByWalletStub).calledOnceWithExactly(senderId);
      expect(result).eql({ id: transferId });
      expect(isDeductStub).calledOnceWithExactly(walletLoginId, {
        id: senderId,
      });
      expect(hasTrustStub).calledOnceWithExactly(
        walletLoginId,
        TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
        { id: senderId },
        { id: receiverId },
      );
      expect(hasControlOverStub.getCall(0).args).eql([walletLoginId, senderId]);
      expect(hasControlOverStub.getCall(1).args).eql([
        walletLoginId,
        receiverId,
      ]);
      expect(transferCreateStub).calledOnceWithExactly({
        originator_wallet_id: walletLoginId,
        source_wallet_id: senderId,
        destination_wallet_id: receiverId,
        state: TransferEnums.STATE.requested,
        parameters: {
          bundle: {
            bundleSize,
          },
        },
        claim: true,
      });
      expect(getTokensByBundleStub).not.called;
      expect(completeTransferStub).not.called;
    });
  });

  describe('acceptTransfer', () => {
    let hasControlOverStub;
    let updateStub;
    let getTokensByBundleStub;
    let completeTransferStub;
    let getTokensByPendingTransferIdStub;

    beforeEach(() => {
      hasControlOverStub = sinon.stub(Wallet.prototype, 'hasControlOver');
      updateStub = sinon.stub(Transfer.prototype, 'update');
      getTokensByBundleStub = sinon.stub(Token.prototype, 'getTokensByBundle');
      completeTransferStub = sinon.stub(Token.prototype, 'completeTransfer');
      getTokensByPendingTransferIdStub = sinon.stub(
        Token.prototype,
        'getTokensByPendingTransferId',
      );
    });

    it('should throw error -- transfer state is not pending', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();

      transferRepositoryStub.getById.resolves({
        id: transferId,
        destination_wallet_id: uuid(),
        state: 'not pending',
      });

      let error;
      try {
        await transferModel.acceptTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(409);
      expect(error.message).eql('The transfer state is not pending');
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).not.called;
      expect(updateStub).not.called;
      expect(getTokensByBundleStub).not.called;
      expect(completeTransferStub).not.called;
      expect(getTokensByPendingTransferIdStub).not.called;
    });

    it('should throw error -- user does not have control', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const receiverId = uuid();

      transferRepositoryStub.getById.resolves({
        id: transferId,
        destination_wallet_id: receiverId,
        state: 'pending',
      });
      hasControlOverStub.resolves(false);

      let error;
      try {
        await transferModel.acceptTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(403);
      expect(error.message).eql(
        'Current account has no permission to accept this transfer',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).calledOnceWithExactly(
        walletLoginId,
        receiverId,
      );
      expect(updateStub).not.called;
      expect(getTokensByBundleStub).not.called;
      expect(completeTransferStub).not.called;
      expect(getTokensByPendingTransferIdStub).not.called;
    });

    it('should throw error -- bundle size - not enough tokens', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const receiverId = uuid();
      const senderId = uuid();

      const transferObject = {
        id: transferId,
        destination_wallet_id: receiverId,
        source_wallet_id: senderId,
        state: 'pending',
        parameters: {
          bundle: {
            bundleSize: 2,
          },
        },
      };

      const tokens = [{ id: uuid() }];

      transferRepositoryStub.getById.resolves(transferObject);
      hasControlOverStub.resolves(true);
      updateStub.resolves({ id: transferId });
      getTokensByBundleStub.resolves(tokens);

      let error;
      try {
        await transferModel.acceptTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(409);
      expect(error.message).eql('Do not have enough tokens');
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).calledOnceWithExactly(
        walletLoginId,
        receiverId,
      );
      expect(updateStub).calledOnceWithExactly({
        ...transferObject,
        state: TransferEnums.STATE.completed,
      });
      expect(getTokensByBundleStub).calledOnceWithExactly(senderId, 2);
      expect(completeTransferStub).not.called;
      expect(getTokensByPendingTransferIdStub).not.called;
    });

    it('should accept transfer - bundle size', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const receiverId = uuid();
      const senderId = uuid();

      const transferObject = {
        id: transferId,
        destination_wallet_id: receiverId,
        source_wallet_id: senderId,
        state: 'pending',
        parameters: {
          bundle: {
            bundleSize: 2,
          },
        },
      };

      const tokens = [{ id: uuid() }, { id: uuid() }];

      transferRepositoryStub.getById.resolves(transferObject);
      hasControlOverStub.resolves(true);
      updateStub.resolves({ id: transferId });
      getTokensByBundleStub.resolves(tokens);

      const result = await transferModel.acceptTransfer(
        transferId,
        walletLoginId,
      );

      expect(result).eql({ id: transferId });
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).calledOnceWithExactly(
        walletLoginId,
        receiverId,
      );
      expect(updateStub).calledOnceWithExactly({
        ...transferObject,
        state: TransferEnums.STATE.completed,
      });
      expect(getTokensByBundleStub).calledOnceWithExactly(senderId, 2);
      expect(completeTransferStub).calledOnceWithExactly(
        tokens,
        transferObject,
      );
      expect(getTokensByPendingTransferIdStub).not.called;
    });

    it('should accept transfer - tokens', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const receiverId = uuid();
      const senderId = uuid();

      const transferObject = {
        id: transferId,
        destination_wallet_id: receiverId,
        source_wallet_id: senderId,
        state: 'pending',
      };

      const tokens = [{ id: uuid() }, { id: uuid() }];

      transferRepositoryStub.getById.resolves(transferObject);
      hasControlOverStub.resolves(true);
      updateStub.resolves({ id: transferId });
      getTokensByPendingTransferIdStub.resolves(tokens);

      const result = await transferModel.acceptTransfer(
        transferId,
        walletLoginId,
      );

      expect(result).eql({ id: transferId });
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).calledOnceWithExactly(
        walletLoginId,
        receiverId,
      );
      expect(updateStub).calledOnceWithExactly({
        ...transferObject,
        state: TransferEnums.STATE.completed,
      });
      expect(getTokensByBundleStub).not.called;
      expect(completeTransferStub).calledOnceWithExactly(
        tokens,
        transferObject,
      );
      expect(getTokensByPendingTransferIdStub).calledOnceWithExactly(
        transferId,
      );
    });
  });

  describe('declineTransfer', () => {
    let hasControlOverStub;
    let updateStub;
    let getTokensByPendingTransferIdStub;
    let cancelTransferStub;

    beforeEach(() => {
      hasControlOverStub = sinon.stub(Wallet.prototype, 'hasControlOver');
      updateStub = sinon.stub(Transfer.prototype, 'update');
      getTokensByPendingTransferIdStub = sinon.stub(
        Token.prototype,
        'getTokensByPendingTransferId',
      );
      cancelTransferStub = sinon.stub(Token.prototype, 'cancelTransfer');
    });

    it('should error out -- transfer state is not pending or requested', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();

      const transferObject = {
        id: transferId,
        source_wallet_id: uuid(),
        destination_wallet_id: uuid(),
        state: 'completed',
      };
      transferRepositoryStub.getById.resolves(transferObject);
      let error;
      try {
        await transferModel.declineTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }
      expect(error.code).eql(409);
      expect(error.message).eql(
        'The transfer state is neither pending nor requested',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).not.called;
      expect(updateStub).not.called;
      expect(getTokensByPendingTransferIdStub).not.called;
      expect(cancelTransferStub).not.called;
    });

    it('should error out -- transfer state is pending and no control', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const receiverId = uuid();

      const transferObject = {
        id: transferId,
        source_wallet_id: senderId,
        destination_wallet_id: receiverId,
        state: 'pending',
      };

      transferRepositoryStub.getById.resolves(transferObject);
      hasControlOverStub.resolves(false);
      let error;
      try {
        await transferModel.declineTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }
      expect(error.code).eql(403);
      expect(error.message).eql(
        'Current account has no permission to decline this transfer',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).calledOnceWithExactly(
        walletLoginId,
        receiverId,
      );
      expect(updateStub).not.called;
      expect(getTokensByPendingTransferIdStub).not.called;
      expect(cancelTransferStub).not.called;
    });

    it('should error out -- transfer state is requested and no control', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const receiverId = uuid();

      const transferObject = {
        id: transferId,
        source_wallet_id: senderId,
        destination_wallet_id: receiverId,
        state: 'requested',
      };

      transferRepositoryStub.getById.resolves(transferObject);
      hasControlOverStub.resolves(false);
      let error;
      try {
        await transferModel.declineTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }
      expect(error.code).eql(403);
      expect(error.message).eql(
        'Current account has no permission to decline this transfer',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).not.called;
      expect(getTokensByPendingTransferIdStub).not.called;
      expect(cancelTransferStub).not.called;
    });

    it('should decline transfer', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const receiverId = uuid();

      const transferObject = {
        id: transferId,
        source_wallet_id: senderId,
        destination_wallet_id: receiverId,
        state: 'requested',
      };

      transferRepositoryStub.getById.resolves(transferObject);
      hasControlOverStub.resolves(true);
      updateStub.resolves({ id: transferId });
      const tokens = [{ id: uuid() }, { id: uuid() }];
      getTokensByPendingTransferIdStub.resolves(tokens);

      const result = await transferModel.declineTransfer(
        transferId,
        walletLoginId,
      );
      expect(result).eql({ id: transferId });
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).calledOnceWithExactly(transferObject);
      expect(getTokensByPendingTransferIdStub).calledOnceWithExactly(
        transferId,
      );
      expect(cancelTransferStub).calledOnceWithExactly(tokens);
    });
  });

  describe('cancelTransfer', () => {
    let hasControlOverStub;
    let updateStub;
    let getTokensByPendingTransferIdStub;
    let cancelTransferStub;

    beforeEach(() => {
      hasControlOverStub = sinon.stub(Wallet.prototype, 'hasControlOver');
      updateStub = sinon.stub(Transfer.prototype, 'update');
      getTokensByPendingTransferIdStub = sinon.stub(
        Token.prototype,
        'getTokensByPendingTransferId',
      );
      cancelTransferStub = sinon.stub(Token.prototype, 'cancelTransfer');
    });

    it('should error out -- transfer state is not pending or requested', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();

      const transferObject = {
        id: transferId,
        source_wallet_id: uuid(),
        destination_wallet_id: uuid(),
        state: 'completed',
      };
      transferRepositoryStub.getById.resolves(transferObject);
      let error;
      try {
        await transferModel.cancelTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }
      expect(error.code).eql(409);
      expect(error.message).eql(
        'The transfer state is neither pending nor requested',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).not.called;
      expect(updateStub).not.called;
      expect(getTokensByPendingTransferIdStub).not.called;
      expect(cancelTransferStub).not.called;
    });

    it('should error out -- transfer state is pending and no control', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const receiverId = uuid();

      const transferObject = {
        id: transferId,
        source_wallet_id: senderId,
        destination_wallet_id: receiverId,
        state: 'pending',
      };

      transferRepositoryStub.getById.resolves(transferObject);
      hasControlOverStub.resolves(false);
      let error;
      try {
        await transferModel.cancelTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }
      expect(error.code).eql(403);
      expect(error.message).eql(
        'Current account has no permission to cancel this transfer',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).not.called;
      expect(getTokensByPendingTransferIdStub).not.called;
      expect(cancelTransferStub).not.called;
    });

    it('should error out -- transfer state is requested and no control', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const receiverId = uuid();

      const transferObject = {
        id: transferId,
        source_wallet_id: senderId,
        destination_wallet_id: receiverId,
        state: 'requested',
      };

      transferRepositoryStub.getById.resolves(transferObject);
      hasControlOverStub.resolves(false);
      let error;
      try {
        await transferModel.cancelTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }
      expect(error.code).eql(403);
      expect(error.message).eql(
        'Current account has no permission to cancel this transfer',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).calledOnceWithExactly(
        walletLoginId,
        receiverId,
      );
      expect(updateStub).not.called;
      expect(getTokensByPendingTransferIdStub).not.called;
      expect(cancelTransferStub).not.called;
    });

    it('should cancel transfer', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const receiverId = uuid();

      const transferObject = {
        id: transferId,
        source_wallet_id: senderId,
        destination_wallet_id: receiverId,
        state: 'requested',
      };

      transferRepositoryStub.getById.resolves(transferObject);
      hasControlOverStub.resolves(true);
      updateStub.resolves({ id: transferId });
      const tokens = [{ id: uuid() }, { id: uuid() }];
      getTokensByPendingTransferIdStub.resolves(tokens);

      const result = await transferModel.cancelTransfer(
        transferId,
        walletLoginId,
      );
      expect(result).eql({ id: transferId });
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlOverStub).calledOnceWithExactly(
        walletLoginId,
        receiverId,
      );
      expect(updateStub).calledOnceWithExactly(transferObject);
      expect(getTokensByPendingTransferIdStub).calledOnceWithExactly(
        transferId,
      );
      expect(cancelTransferStub).calledOnceWithExactly(tokens);
    });
  });

  describe('fulfillTransfer', () => {
    let hasControlStub;
    let updateStub;
    let getTokensByBundleStub;
    let completeTransferStub;
    let getTokenByPendingTransferIdStub;

    beforeEach(() => {
      hasControlStub = sinon.stub(Wallet.prototype, 'hasControlOver');
      updateStub = sinon.stub(Transfer.prototype, 'update');
      getTokensByBundleStub = sinon.stub(Token.prototype, 'getTokensByBundle');
      completeTransferStub = sinon.stub(Token.prototype, 'completeTransfer');
      getTokenByPendingTransferIdStub = sinon.stub(
        Token.prototype,
        'getTokensByPendingTransferId',
      );
    });

    it('should error out -- does not have control', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();

      transferRepositoryStub.getById.resolves({
        id: transferId,
        source_wallet_id: senderId,
      });
      hasControlStub.resolves(false);
      let error;
      try {
        await transferModel.fulfillTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(403);
      expect(error.message).eql(
        'Current account has no permission to fulfill this transfer',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).not.called;
      expect(getTokensByBundleStub).not.called;
      expect(completeTransferStub).not.called;
      expect(getTokenByPendingTransferIdStub).not.called;
    });

    it('should error out -- transfer state is not requested', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();

      transferRepositoryStub.getById.resolves({
        id: transferId,
        source_wallet_id: senderId,
        state: 'sent',
      });
      hasControlStub.resolves(true);
      let error;
      try {
        await transferModel.fulfillTransfer(transferId, walletLoginId);
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(409);
      expect(error.message).eql(
        'Operation forbidden, the transfer state is wrong',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).not.called;
      expect(getTokensByBundleStub).not.called;
      expect(completeTransferStub).not.called;
      expect(getTokenByPendingTransferIdStub).not.called;
    });

    it('should fulfill transfer -- bundle size is valid', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();

      const transferResult = {
        id: transferId,
        source_wallet_id: senderId,
        state: TransferEnums.STATE.requested,
        parameters: {
          bundle: {
            bundleSize: 4,
          },
        },
      };
      const tokens = [{ id: uuid() }, { id: uuid() }];
      transferRepositoryStub.getById.resolves(transferResult);
      hasControlStub.resolves(true);
      updateStub.resolves({ id: transferId, state: 'fulfilled' });
      getTokensByBundleStub.resolves(tokens);

      const result = await transferModel.fulfillTransfer(
        transferId,
        walletLoginId,
      );

      expect(result).eql({ id: transferId, state: 'fulfilled' });
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).calledOnceWithExactly(transferResult);
      expect(getTokensByBundleStub).calledOnceWithExactly(senderId, 4);
      expect(completeTransferStub).calledOnceWithExactly(
        tokens,
        transferResult,
      );
      expect(getTokenByPendingTransferIdStub).not.called;
    });

    it('should fulfill transfer -- tokens', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();

      const transferResult = {
        id: transferId,
        source_wallet_id: senderId,
        state: TransferEnums.STATE.requested,
      };
      const tokens = [{ id: uuid() }, { id: uuid() }];
      transferRepositoryStub.getById.resolves(transferResult);
      hasControlStub.resolves(true);
      updateStub.resolves({ id: transferId, state: 'fulfilled' });
      getTokenByPendingTransferIdStub.resolves(tokens);

      const result = await transferModel.fulfillTransfer(
        transferId,
        walletLoginId,
      );

      expect(result).eql({ id: transferId, state: 'fulfilled' });
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).calledOnceWithExactly(transferResult);
      expect(getTokensByBundleStub).not.called;
      expect(completeTransferStub).calledOnceWithExactly(
        tokens,
        transferResult,
      );
      expect(getTokenByPendingTransferIdStub).calledOnceWithExactly(transferId);
    });
  });

  describe('fulfillTransferWithTokens', () => {
    let hasControlStub;
    let updateStub;
    let completeTransferStub;

    beforeEach(() => {
      hasControlStub = sinon.stub(Wallet.prototype, 'hasControlOver');
      updateStub = sinon.stub(Transfer.prototype, 'update');
      completeTransferStub = sinon.stub(Token.prototype, 'completeTransfer');
    });

    it('should error out -- does not have control', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const tokens = [{ id: uuid() }, { id: uuid() }];

      transferRepositoryStub.getById.resolves({
        id: transferId,
        source_wallet_id: senderId,
      });
      hasControlStub.resolves(false);
      let error;
      try {
        await transferModel.fulfillTransferWithTokens(
          transferId,
          tokens,
          walletLoginId,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(403);
      expect(error.message).eql(
        'Current account has no permission to fulfill this transfer',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).not.called;
      expect(completeTransferStub).not.called;
    });

    it('should error out -- does not have control', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const tokens = [{ id: uuid() }, { id: uuid() }];

      transferRepositoryStub.getById.resolves({
        id: transferId,
        source_wallet_id: senderId,
        state: 'sent',
      });
      hasControlStub.resolves(true);
      let error;
      try {
        await transferModel.fulfillTransferWithTokens(
          transferId,
          tokens,
          walletLoginId,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(409);
      expect(error.message).eql(
        'Operation forbidden, the transfer state is wrong',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).not.called;
      expect(completeTransferStub).not.called;
    });

    it('should error out -- bundle size is not valid', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const tokens = [{ id: uuid() }, { id: uuid() }];

      const transferResult = {
        id: transferId,
        source_wallet_id: senderId,
        state: TransferEnums.STATE.requested,
      };
      transferRepositoryStub.getById.resolves(transferResult);
      hasControlStub.resolves(true);
      updateStub.resolves({ id: transferId, state: 'fulfilled' });
      let error;
      try {
        await transferModel.fulfillTransferWithTokens(
          transferId,
          tokens,
          walletLoginId,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(409);
      expect(error.message).eql('No need to specify tokens');
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).calledOnceWithExactly(transferResult);
      expect(completeTransferStub).not.called;
    });

    it('should error out -- token size is greater than bundleSize', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const tokens = [{ id: uuid() }, { id: uuid() }];

      const transferResult = {
        id: transferId,
        source_wallet_id: senderId,
        state: TransferEnums.STATE.requested,
        parameters: {
          bundle: {
            bundleSize: 1,
          },
        },
      };
      transferRepositoryStub.getById.resolves(transferResult);
      hasControlStub.resolves(true);
      updateStub.resolves({ id: transferId, state: 'fulfilled' });
      let error;
      try {
        await transferModel.fulfillTransferWithTokens(
          transferId,
          tokens,
          walletLoginId,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(409);
      expect(error.message).eql(
        'Too many tokens to transfer, please provider 1 tokens for this transfer',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).calledOnceWithExactly(transferResult);
      expect(completeTransferStub).not.called;
    });

    it('should error out -- token size is less than bundleSize', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const tokens = [{ id: uuid() }, { id: uuid() }];

      const transferResult = {
        id: transferId,
        source_wallet_id: senderId,
        state: TransferEnums.STATE.requested,
        parameters: {
          bundle: {
            bundleSize: 3,
          },
        },
      };
      transferRepositoryStub.getById.resolves(transferResult);
      hasControlStub.resolves(true);
      updateStub.resolves({ id: transferId, state: 'fulfilled' });
      let error;
      try {
        await transferModel.fulfillTransferWithTokens(
          transferId,
          tokens,
          walletLoginId,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(409);
      expect(error.message).eql(
        'Too few tokens to transfer, please provider 3 tokens for this transfer',
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).calledOnceWithExactly(transferResult);
      expect(completeTransferStub).not.called;
    });

    it('should error out -- token does not belong to sender wallet', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();
      const randomUuid = uuid();

      const walletId1 = uuid();
      const walletId2 = uuid();

      const tokens = [
        { id: walletId1, wallet_id: senderId },
        { id: walletId2, wallet_id: randomUuid },
      ];

      const transferResult = {
        id: transferId,
        source_wallet_id: senderId,
        state: TransferEnums.STATE.requested,
        parameters: {
          bundle: {
            bundleSize: 2,
          },
        },
      };
      transferRepositoryStub.getById.resolves(transferResult);
      hasControlStub.resolves(true);
      updateStub.resolves({ id: transferId, state: 'fulfilled' });
      let error;
      try {
        await transferModel.fulfillTransferWithTokens(
          transferId,
          tokens,
          walletLoginId,
        );
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(403);
      expect(error.message).eql(
        `the token:${walletId2} does not belong to the sender wallet`,
      );
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).calledOnceWithExactly(transferResult);
      expect(completeTransferStub).not.called;
    });

    it('should fulfill transfer with tokens', async () => {
      const transferId = uuid();
      const walletLoginId = uuid();
      const senderId = uuid();

      const walletId1 = uuid();
      const walletId2 = uuid();

      const tokens = [
        { id: walletId1, wallet_id: senderId },
        { id: walletId2, wallet_id: senderId },
      ];

      const transferResult = {
        id: transferId,
        source_wallet_id: senderId,
        state: TransferEnums.STATE.requested,
        parameters: {
          bundle: {
            bundleSize: 2,
          },
        },
      };
      transferRepositoryStub.getById.resolves(transferResult);
      hasControlStub.resolves(true);
      updateStub.resolves({ id: transferId, state: 'fulfilled' });

      const result = await transferModel.fulfillTransferWithTokens(
        transferId,
        tokens,
        walletLoginId,
      );

      expect(result).eql({ id: transferId, state: 'fulfilled' });
      expect(transferRepositoryStub.getById).calledOnceWithExactly(transferId);
      expect(hasControlStub).calledOnceWithExactly(walletLoginId, senderId);
      expect(updateStub).calledOnceWithExactly(transferResult);
      expect(completeTransferStub).calledOnceWithExactly(
        tokens,
        transferResult,
      );
    });
  });
});
