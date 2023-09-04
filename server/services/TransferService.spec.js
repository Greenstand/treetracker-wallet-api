const sinon = require('sinon');
const { expect } = require('chai');

const TransferService = require('./TransferService');
const Transfer = require('../models/Transfer');
const TokenService = require('./TokenService');
const TransferEnums = require('../utils/transfer-enum');
const WalletService = require('./WalletService');
const Session = require('../infra/database/Session');

describe('TransferService', () => {
  let transferService;
  let beginTransactionStub;
  let commitTransactionStub;
  let rollbackTransactionStub;
  let isTransactionInProgressStub;

  beforeEach(() => {
    transferService = new TransferService();
    isTransactionInProgressStub = sinon.stub(
      Session.prototype,
      'isTransactionInProgress',
    );
    beginTransactionStub = sinon
      .stub(Session.prototype, 'beginTransaction')
      .callsFake(async () => isTransactionInProgressStub.returns(true));
    commitTransactionStub = sinon.stub(Session.prototype, 'commitTransaction');
    rollbackTransactionStub = sinon.stub(
      Session.prototype,
      'rollbackTransaction',
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getTransferById', () => {
    let getByIdStub;

    beforeEach(() => {
      getByIdStub = sinon.stub(Transfer.prototype, 'getById');
    });

    it('getTransferById -- should error out if response is empty', async () => {
      getByIdStub.resolves();
      let error;
      try {
        await transferService.getTransferById('transferId', 'walletLoginId');
      } catch (e) {
        error = e;
      }
      expect(
        getByIdStub.calledOnceWithExactly({
          transferId: 'transferId',
          walletLoginId: 'walletLoginId',
        }),
      ).eql(true);
      expect(error.code).eql(404);
      expect(error.message).eql(
        'Can not find this transfer or it is not related to this wallet',
      );
    });

    it('getTransferById -- return transfer', async () => {
      getByIdStub.resolves('transfer');
      const transfer = await transferService.getTransferById(
        'transferId',
        'walletLoginId',
      );
      expect(transfer).eql('transfer');
      expect(
        getByIdStub.calledOnceWithExactly({
          transferId: 'transferId',
          walletLoginId: 'walletLoginId',
        }),
      ).eql(true);
    });
  });

  describe('getTokensByTransferId', () => {
    let getTransferByIdStub;
    let getTokensByTransferIdStub;
    let getTokensByPendingTransferIdStub;

    beforeEach(() => {
      getTransferByIdStub = sinon.stub(
        TransferService.prototype,
        'getTransferById',
      );

      getTokensByPendingTransferIdStub = sinon
        .stub(TokenService.prototype, 'getTokensByPendingTransferId')
        .resolves(['tokensForPendingTransfer']);

      getTokensByTransferIdStub = sinon
        .stub(TokenService.prototype, 'getTokensByTransferId')
        .resolves(['tokens']);
    });

    it(`getTokensByTransferId -- transfer's state is completed`, async () => {
      getTransferByIdStub.resolves({
        id: 'id',
        state: TransferEnums.STATE.completed,
      });

      const tokens = await transferService.getTokensByTransferId(
        'transferId',
        'walletLoginId',
        1,
        1,
      );
      expect(tokens).eql(['tokens']);
      expect(getTokensByTransferIdStub.calledOnceWithExactly('id', 1, 1)).eql(
        true,
      );
      expect(getTokensByPendingTransferIdStub.notCalled).eql(true);
    });

    it(`getTokensByTransferId -- transfer's state is not completed`, async () => {
      getTransferByIdStub.resolves({
        id: 'id',
      });

      const tokens = await transferService.getTokensByTransferId(
        'transferId',
        'walletLoginId',
        1,
        1,
      );
      expect(tokens).eql(['tokensForPendingTransfer']);
      expect(getTokensByTransferIdStub.notCalled).eql(true);
      expect(
        getTokensByPendingTransferIdStub.calledOnceWithExactly('id', 1, 1),
      ).eql(true);
    });
  });

  describe('getByFilter', () => {
    let getTransfersStub;
    let walletGetByIdOrNameStub;

    beforeEach(() => {
      getTransfersStub = sinon
        .stub(Transfer.prototype, 'getTransfers')
        .resolves({transfers: ['transfers'], count: 1});

      walletGetByIdOrNameStub = sinon
        .stub(WalletService.prototype, 'getByIdOrName')
        .resolves({ id: 'id' });
    });

    it('getByFilter -- without wallet filter', async () => {
      const transfers = await transferService.getByFilter(
        { state: 'state', limit: 1, offset: 1 },
        'walletLoginId',
      );
      expect(transfers).eql({transfers: ['transfers'], count:1});
      expect(
        getTransfersStub.calledOnceWithExactly({
          state: 'state',
          limit: 1,
          offset: 1,
          walletLoginId: 'walletLoginId',
          walletId: undefined,
          before: undefined,
          after: undefined,
          sort_by: undefined,
        }),
      ).eql(true);
      expect(walletGetByIdOrNameStub.notCalled).eql(true);
    });

    it('getByFilter', async () => {
      const before = new Date().toISOString();
      const after = new Date().toISOString();
      const transfers = await transferService.getByFilter(
        {
          state: 'state',
          limit: 1,
          offset: 1,
          wallet: 'wallet',
          before,
          after,
        },
        'walletLoginId',
      );
      expect(transfers).eql({transfers:['transfers'], count:1});
      expect(
        getTransfersStub.calledOnceWithExactly({
          state: 'state',
          limit: 1,
          offset: 1,
          walletLoginId: 'walletLoginId',
          walletId: 'id',
          before,
          after,
          sort_by: undefined,
        }),
      ).eql(true);
      expect(walletGetByIdOrNameStub.calledOnceWithExactly('wallet')).eql(true);
    });
  });

  describe('acceptTransfer', () => {
    let acceptTransferStub;

    beforeEach(() => {
      acceptTransferStub = sinon.stub(Transfer.prototype, 'acceptTransfer');
    });

    it('should rollback transaction if it errors out', async () => {
      acceptTransferStub.rejects();
      try {
        await transferService.acceptTransfer('transferId', 'walletLoginId');
      } catch (e) {}
      expect(
        acceptTransferStub.calledOnceWithExactly('transferId', 'walletLoginId'),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
    });

    it('should accept transfer', async () => {
      acceptTransferStub.resolves('transferAccepted');
      const result = await transferService.acceptTransfer(
        'transferId',
        'walletLoginId',
      );
      expect(result).eql('transferAccepted');
      expect(
        acceptTransferStub.calledOnceWithExactly('transferId', 'walletLoginId'),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
    });
  });

  describe('declineTransfer', () => {
    let declineTransferStub;

    beforeEach(() => {
      declineTransferStub = sinon.stub(Transfer.prototype, 'declineTransfer');
    });

    it('should rollback transaction if it errors out', async () => {
      declineTransferStub.rejects();
      try {
        await transferService.declineTransfer('transferId', 'walletLoginId');
      } catch (e) {}
      expect(
        declineTransferStub.calledOnceWithExactly(
          'transferId',
          'walletLoginId',
        ),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
    });

    it('should decline transfer', async () => {
      declineTransferStub.resolves('transferDeclined');
      const result = await transferService.declineTransfer(
        'transferId',
        'walletLoginId',
      );
      expect(result).eql('transferDeclined');
      expect(
        declineTransferStub.calledOnceWithExactly(
          'transferId',
          'walletLoginId',
        ),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
    });
  });

  describe('cancelTransfer', () => {
    let cancelTransferStub;

    beforeEach(() => {
      cancelTransferStub = sinon.stub(Transfer.prototype, 'cancelTransfer');
    });

    it('should rollback transaction if it errors out', async () => {
      cancelTransferStub.rejects();
      try {
        await transferService.cancelTransfer('transferId', 'walletLoginId');
      } catch (e) {}
      expect(
        cancelTransferStub.calledOnceWithExactly('transferId', 'walletLoginId'),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
    });

    it('should cancel transfer', async () => {
      cancelTransferStub.resolves('transferCancelled');
      const result = await transferService.cancelTransfer(
        'transferId',
        'walletLoginId',
      );
      expect(result).eql('transferCancelled');
      expect(
        cancelTransferStub.calledOnceWithExactly('transferId', 'walletLoginId'),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
    });
  });

  describe('initiateTransfer', () => {
    let getByIdOrNameStub;
    let transferStub;
    let transferBundleStub;
    let tokenServiceGetByIdStub;

    beforeEach(() => {
      getByIdOrNameStub = sinon.stub(WalletService.prototype, 'getByIdOrName');
      transferStub = sinon.stub(Transfer.prototype, 'transfer');
      transferBundleStub = sinon.stub(Transfer.prototype, 'transferBundle');
      tokenServiceGetByIdStub = sinon.stub(TokenService.prototype, 'getById');
    });

    it('should rollback transaction if error occurs', async () => {
      getByIdOrNameStub.rejects();
      try {
        await transferService.initiateTransfer(
          { sender_wallet: 'wallet' },
          'walletLoginId',
        );
      } catch (e) {}
      expect(getByIdOrNameStub.calledOnceWithExactly('wallet')).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
      expect(transferStub.notCalled).eql(true);
      expect(transferBundleStub.notCalled).eql(true);
      expect(tokenServiceGetByIdStub.notCalled).eql(true);
    });

    it('should initiate transfer -- token transfer without valid state', async () => {
      getByIdOrNameStub.onFirstCall().resolves('senderWallet');
      getByIdOrNameStub.onSecondCall().resolves('receiverWallet');
      tokenServiceGetByIdStub.onFirstCall().resolves('token1');
      tokenServiceGetByIdStub.onSecondCall().resolves('token2');

      transferStub.resolves({ state: 'state' });
      let error;
      try {
        await transferService.initiateTransfer(
          {
            sender_wallet: 'wallet1',
            receiver_wallet: 'wallet2',
            claim: true,
            tokens: ['id1', 'id2'],
          },
          'walletLoginId',
        );
      } catch (e) {
        error = e;
      }

      expect(error.message).eql('Unexpected state state');
      expect(
        tokenServiceGetByIdStub
          .getCall(0)
          .calledWithExactly({ id: 'id1' }, true),
      ).eql(true);
      expect(
        tokenServiceGetByIdStub
          .getCall(1)
          .calledWithExactly({ id: 'id2' }, true),
      ).eql(true);
      expect(getByIdOrNameStub.getCall(0).calledWithExactly('wallet1')).eql(
        true,
      );
      expect(getByIdOrNameStub.getCall(1).calledWithExactly('wallet2')).eql(
        true,
      );
      expect(
        transferStub.calledOnceWithExactly(
          'walletLoginId',
          'senderWallet',
          'receiverWallet',
          ['token1', 'token2'],
          true,
        ),
      );
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
    });

    it('should initiate transfer -- token transfer with state completed', async () => {
      getByIdOrNameStub.onFirstCall().resolves('senderWallet');
      getByIdOrNameStub.onSecondCall().resolves('receiverWallet');
      tokenServiceGetByIdStub.onFirstCall().resolves('token1');
      tokenServiceGetByIdStub.onSecondCall().resolves('token2');

      transferStub.resolves({
        state: TransferEnums.STATE.completed,
      });
      const result = await transferService.initiateTransfer(
        {
          sender_wallet: 'wallet1',
          receiver_wallet: 'wallet2',
          claim: true,
          tokens: ['id1', 'id2'],
        },
        'walletLoginId',
      );

      expect(result.status).eql(201);
      expect(result.result).eql({ state: TransferEnums.STATE.completed });
      expect(
        tokenServiceGetByIdStub
          .getCall(0)
          .calledWithExactly({ id: 'id1' }, true),
      ).eql(true);
      expect(
        tokenServiceGetByIdStub
          .getCall(1)
          .calledWithExactly({ id: 'id2' }, true),
      ).eql(true);
      expect(getByIdOrNameStub.getCall(0).calledWithExactly('wallet1')).eql(
        true,
      );
      expect(getByIdOrNameStub.getCall(1).calledWithExactly('wallet2')).eql(
        true,
      );
      expect(
        transferStub.calledOnceWithExactly(
          'walletLoginId',
          'senderWallet',
          'receiverWallet',
          ['token1', 'token2'],
          true,
        ),
      );
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
    });

    it('should initiate transfer -- token transfer with state pending/requested', async () => {
      getByIdOrNameStub.onFirstCall().resolves('senderWallet');
      getByIdOrNameStub.onSecondCall().resolves('receiverWallet');
      tokenServiceGetByIdStub.onFirstCall().resolves('token1');
      tokenServiceGetByIdStub.onSecondCall().resolves('token2');
      transferStub.resolves({
        state: TransferEnums.STATE.pending,
      });
      const result = await transferService.initiateTransfer(
        {
          sender_wallet: 'wallet1',
          receiver_wallet: 'wallet2',
          claim: true,
          tokens: ['id1', 'id2'],
        },
        'walletLoginId',
      );

      expect(result.status).eql(202);
      expect(result.result).eql({ state: TransferEnums.STATE.pending });
      expect(
        tokenServiceGetByIdStub
          .getCall(0)
          .calledWithExactly({ id: 'id1' }, true),
      ).eql(true);
      expect(
        tokenServiceGetByIdStub
          .getCall(1)
          .calledWithExactly({ id: 'id2' }, true),
      ).eql(true);
      expect(getByIdOrNameStub.getCall(0).calledWithExactly('wallet1')).eql(
        true,
      );
      expect(getByIdOrNameStub.getCall(1).calledWithExactly('wallet2')).eql(
        true,
      );
      expect(
        transferStub.calledOnceWithExactly(
          'walletLoginId',
          'senderWallet',
          'receiverWallet',
          ['token1', 'token2'],
          true,
        ),
      );
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
    });

    it('should initiate transfer -- bundle transfer', async () => {
      getByIdOrNameStub.onFirstCall().resolves('senderWallet');
      getByIdOrNameStub.onSecondCall().resolves('receiverWallet');
      transferBundleStub.resolves({
        state: TransferEnums.STATE.pending,
      });
      const result = await transferService.initiateTransfer(
        {
          sender_wallet: 'wallet1',
          receiver_wallet: 'wallet2',
          claim: true,
          bundle: { bundle_size: 10 },
        },
        'walletLoginId',
      );

      expect(result.status).eql(202);
      expect(result.result).eql({ state: TransferEnums.STATE.pending });
      expect(getByIdOrNameStub.getCall(0).calledWithExactly('wallet1')).eql(
        true,
      );
      expect(getByIdOrNameStub.getCall(1).calledWithExactly('wallet2')).eql(
        true,
      );
      expect(
        transferBundleStub.calledOnceWithExactly(
          'walletLoginId',
          'senderWallet',
          'receiverWallet',
          10,
          true,
        ),
      );
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
    });
  });

  describe('fulfillTransfer', () => {
    let fulfillTransferStub;
    let fulfillTransferWithTokensStub;
    let tokenServiceGetByIdStub;

    beforeEach(() => {
      fulfillTransferStub = sinon.stub(Transfer.prototype, 'fulfillTransfer');
      fulfillTransferWithTokensStub = sinon.stub(
        Transfer.prototype,
        'fulfillTransferWithTokens',
      );
      tokenServiceGetByIdStub = sinon.stub(TokenService.prototype, 'getById');
    });

    it('should rollback transaction if error occurs', async () => {
      fulfillTransferStub.rejects();
      try {
        await transferService.fulfillTransfer('walletLoginId', 'transferId', {
          implicit: true,
        });
      } catch (e) {}
      expect(
        fulfillTransferStub.calledOnceWithExactly(
          'transferId',
          'walletLoginId',
        ),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
      expect(fulfillTransferWithTokensStub.notCalled).eql(true);
      expect(tokenServiceGetByIdStub.notCalled).eql(true);
    });

    it('should fulfillTransfer -- implicit', async () => {
      fulfillTransferStub.resolves('result');
      const result = await transferService.fulfillTransfer(
        'walletLoginId',
        'transferId',
        { implicit: true },
      );
      expect(result).eql('result');
      expect(
        fulfillTransferStub.calledOnceWithExactly(
          'transferId',
          'walletLoginId',
        ),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
      expect(fulfillTransferWithTokensStub.notCalled).eql(true);
      expect(tokenServiceGetByIdStub.notCalled).eql(true);
    });

    it('should fulfillTransfer -- tokens', async () => {
      fulfillTransferWithTokensStub.resolves('result');
      tokenServiceGetByIdStub.onFirstCall().resolves('token1');
      tokenServiceGetByIdStub.onSecondCall().resolves('token2');

      const result = await transferService.fulfillTransfer(
        'walletLoginId',
        'transferId',
        { tokens: ['id1', 'id2'] },
      );
      expect(result).eql('result');
      expect(fulfillTransferStub.notCalled).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
      expect(
        fulfillTransferWithTokensStub.calledOnceWithExactly(
          'transferId',
          ['token1', 'token2'],
          'walletLoginId',
        ),
      ).eql(true);
      expect(
        tokenServiceGetByIdStub
          .getCall(0)
          .calledWithExactly({ id: 'id1' }, true),
      ).eql(true);
      expect(
        tokenServiceGetByIdStub
          .getCall(1)
          .calledWithExactly({ id: 'id2' }, true),
      ).eql(true);
    });
  });
});
