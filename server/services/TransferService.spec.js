const sinon = require('sinon');
const { expect } = require('chai');

const TransferService = require('./TransferService');
const Transfer = require('../models/Transfer');
const TokenService = require('./TokenService');
const TransferEnums = require('../utils/transfer-enum');
const EventEnums = require('../utils/event-enum');
const WalletService = require('./WalletService');
const Session = require('../infra/database/Session');
const EventService = require('./EventService');

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
        'Transfer does not exist or it is not related to this wallet',
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
        .resolves({ transfers: ['transfers'], count: 1 });

      walletGetByIdOrNameStub = sinon
        .stub(WalletService.prototype, 'getByIdOrName')
        .resolves({ id: 'id' });
    });

    it('getByFilter -- without wallet filter', async () => {
      const transfers = await transferService.getByFilter(
        { state: 'state', limit: 1, offset: 1 },
        'walletLoginId',
      );
      expect(transfers).eql({ transfers: ['transfers'], count: 1 });
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
          order: undefined,
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
      expect(transfers).eql({ transfers: ['transfers'], count: 1 });
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
          order: undefined,
        }),
      ).eql(true);
      expect(walletGetByIdOrNameStub.calledOnceWithExactly('wallet')).eql(true);
    });
  });

  describe('acceptTransfer', () => {
    let acceptTransferStub;
    let getByIdStub;
    let getByNameStub;
    let logEventStub;

    const originator_wallet_id = {
      id: 'id',
    };

    const destination_wallet_id = { id: 'id' };

    beforeEach(() => {
      acceptTransferStub = sinon.stub(Transfer.prototype, 'acceptTransfer');
      logEventStub = sinon.stub(EventService.prototype, 'logEvent');
      getByIdStub = sinon.stub(Transfer.prototype, 'getById').resolves({
        originating_wallet: 'originating_wallet',
        destination_wallet: 'destination_wallet',
      });
      getByNameStub = sinon.stub(WalletService.prototype, 'getByName');
    });

    it('should rollback transaction if it errors out', async () => {
      acceptTransferStub.rejects();
      try {
        await transferService.acceptTransfer('transferId', 'walletLoginId');
      } catch (e) {}

      expect(logEventStub.notCalled).to.eql(true);
      expect(
        acceptTransferStub.calledOnceWithExactly('transferId', 'walletLoginId'),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
    });

    it('should accept transfer', async () => {
      getByNameStub.onFirstCall().resolves(originator_wallet_id);
      getByNameStub.onSecondCall().resolves(destination_wallet_id);
      acceptTransferStub.resolves({
        state: TransferEnums.STATE.completed,
      });
      const result = await transferService.acceptTransfer(
        'transferId',
        'walletLoginId',
      );
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(getByIdStub.calledOnceWithExactly('transferId', 'walletLoginId'));
      expect(getByNameStub.getCall(0).calledWithExactly('originating_wallet'));
      expect(getByNameStub.getCall(1).calledWithExactly('destination_wallet'));
      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: originator_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_completed,
          payload: { result },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: destination_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_completed,
          payload: { result },
        }),
      ).eql(true);
      expect(result).eql({
        state: TransferEnums.STATE.completed,
      });
      expect(
        acceptTransferStub.calledOnceWithExactly('transferId', 'walletLoginId'),
      ).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
    });
  });

  describe('declineTransfer', () => {
    let declineTransferStub;
    let getByIdStub;
    let getByNameStub;
    let logEventStub;

    const originator_wallet_id = {
      id: 'id',
    };

    const destination_wallet_id = { id: 'id' };

    const wallet_id = {
      originating_wallet: 'originating_wallet',
      destination_wallet: 'destination_wallet',
    };

    beforeEach(() => {
      declineTransferStub = sinon.stub(Transfer.prototype, 'declineTransfer');
      logEventStub = sinon.stub(EventService.prototype, 'logEvent');
      getByIdStub = sinon
        .stub(Transfer.prototype, 'getById')
        .resolves(wallet_id);
      getByNameStub = sinon.stub(WalletService.prototype, 'getByName');
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
      expect(logEventStub.notCalled).to.eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
    });

    it('should decline transfer', async () => {
      getByNameStub.onFirstCall().resolves(originator_wallet_id);
      getByNameStub.onSecondCall().resolves(destination_wallet_id);

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
      expect(getByIdStub.calledOnceWithExactly('transferId', 'walletLoginId'));
      expect(
        getByNameStub
          .getCall(0)
          .calledWithExactly(wallet_id.originating_wallet),
      );
      expect(
        getByNameStub
          .getCall(1)
          .calledWithExactly(wallet_id.destination_wallet),
      );
      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: originator_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_request_cancelled_by_destination,
          payload: { result },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: originator_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_failed,
          payload: { result },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(2).calledWithExactly({
          wallet_id: destination_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_request_cancelled_by_destination,
          payload: { result },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(3).calledWithExactly({
          wallet_id: destination_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_failed,
          payload: { result },
        }),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
    });
  });

  describe('cancelTransfer', () => {
    let cancelTransferStub;
    let logEventStub;
    let getByIdStub;
    let getByNameStub;

    const originator_wallet_id = {
      id: 'id',
    };

    const destination_wallet_id = { id: 'id' };

    const wallet_id = {
      originating_wallet: 'originating_wallet',
      destination_wallet: 'destination_wallet',
    };

    beforeEach(() => {
      cancelTransferStub = sinon.stub(Transfer.prototype, 'cancelTransfer');
      logEventStub = sinon.stub(EventService.prototype, 'logEvent');
      getByIdStub = sinon
        .stub(Transfer.prototype, 'getById')
        .resolves(wallet_id);
      getByNameStub = sinon.stub(WalletService.prototype, 'getByName');
    });

    it('should rollback transaction if it errors out', async () => {
      cancelTransferStub.rejects();
      try {
        await transferService.cancelTransfer('transferId', 'walletLoginId');
      } catch (e) {}
      expect(
        cancelTransferStub.calledOnceWithExactly('transferId', 'walletLoginId'),
      ).eql(true);
      expect(logEventStub.notCalled).to.eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
    });

    it('should cancel transfer', async () => {
      getByNameStub.onFirstCall().resolves(originator_wallet_id);
      getByNameStub.onSecondCall().resolves(destination_wallet_id);
      cancelTransferStub.resolves('transferCancelled');
      const result = await transferService.cancelTransfer(
        'transferId',
        'walletLoginId',
      );
      expect(getByIdStub.calledOnceWithExactly('transferId', 'walletLoginId'));
      expect(
        getByNameStub
          .getCall(0)
          .calledWithExactly(wallet_id.originating_wallet),
      );
      expect(
        getByNameStub
          .getCall(1)
          .calledWithExactly(wallet_id.destination_wallet),
      );
      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: originator_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_pending_cancelled_by_requestor,
          payload: { result },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: originator_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_failed,
          payload: { result },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(2).calledWithExactly({
          wallet_id: destination_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_pending_cancelled_by_requestor,
          payload: { result },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(3).calledWithExactly({
          wallet_id: destination_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_failed,
          payload: { result },
        }),
      ).eql(true);
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
    let logEventStub;

    beforeEach(() => {
      getByIdOrNameStub = sinon.stub(WalletService.prototype, 'getByIdOrName');
      transferStub = sinon.stub(Transfer.prototype, 'transfer');
      transferBundleStub = sinon.stub(Transfer.prototype, 'transferBundle');
      tokenServiceGetByIdStub = sinon.stub(TokenService.prototype, 'getById');
      logEventStub = sinon.stub(EventService.prototype, 'logEvent');
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
      expect(logEventStub.notCalled).to.eql(true);
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
      expect(logEventStub.notCalled).to.eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
    });

    it('should initiate transfer -- token transfer with state completed', async () => {
      const senderWallet = { id: 'senderWalletId', name: 'senderWalletName' };
      const receiverWallet = {
        id: 'receiverWalletId',
        name: 'receiverWalletName',
      };

      const transferBody = {
        sender_wallet: 'wallet1',
        receiver_wallet: 'wallet2',
        claim: true,
        tokens: ['id1', 'id2'],
      };

      getByIdOrNameStub.onFirstCall().resolves(senderWallet);
      getByIdOrNameStub.onSecondCall().resolves(receiverWallet);
      tokenServiceGetByIdStub.onFirstCall().resolves({ id: 'token1' });
      tokenServiceGetByIdStub.onSecondCall().resolves({ id: 'token2' });

      transferStub.resolves({
        state: TransferEnums.STATE.completed,
      });
      const result = await transferService.initiateTransfer(
        transferBody,
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
          senderWallet,
          receiverWallet,
          [{ id: 'token1' }, { id: 'token2' }],
          true,
        ),
      );
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: senderWallet.id,
          type: EventEnums.TRANSFER.transfer_completed,
          payload: {
            walletSender: senderWallet.name,
            walletReceiver: receiverWallet.name,
            tokenTransferred: ['token1', 'token2'],
            claim: transferBody.claim,
          },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: receiverWallet.id,
          type: EventEnums.TRANSFER.transfer_completed,
          payload: {
            walletSender: senderWallet.name,
            walletReceiver: receiverWallet.name,
            tokenTransferred: ['token1', 'token2'],
            claim: transferBody.claim,
          },
        }),
      ).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
    });

    it('should initiate transfer -- token transfer with state pending/requested', async () => {
      const senderWallet = { id: 'senderWalletId', name: 'senderWalletName' };
      const receiverWallet = {
        id: 'receiverWalletId',
        name: 'receiverWalletName',
      };

      getByIdOrNameStub.onFirstCall().resolves(senderWallet);
      getByIdOrNameStub.onSecondCall().resolves(receiverWallet);
      tokenServiceGetByIdStub.onFirstCall().resolves({ id: 'token1' });
      tokenServiceGetByIdStub.onSecondCall().resolves({ id: 'token2' });
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
      expect(beginTransactionStub.calledOnce).eql(true);
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
          senderWallet,
          receiverWallet,
          [{ id: 'token1' }, { id: 'token2' }],
          true,
        ),
      );
      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: senderWallet.id,
          type: EventEnums.TRANSFER.transfer_requested,
          payload: {
            walletSender: senderWallet.name,
            walletReceiver: receiverWallet.name,
            tokenTransferred: ['token1', 'token2'],
            transferState: 'pending',
            claim: true,
          },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: receiverWallet.id,
          type: EventEnums.TRANSFER.transfer_requested,
          payload: {
            walletSender: senderWallet.name,
            walletReceiver: receiverWallet.name,
            tokenTransferred: ['token1', 'token2'],
            transferState: 'pending',
            claim: true,
          },
        }),
      ).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
    });

    it('should initiate transfer -- bundle transfer', async () => {
      const senderWallet = { id: 'senderWalletId', name: 'senderWalletName' };
      const receiverWallet = {
        id: 'receiverWalletId',
        name: 'receiverWalletName',
      };

      getByIdOrNameStub.onFirstCall().resolves(senderWallet);
      getByIdOrNameStub.onSecondCall().resolves(receiverWallet);
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
          senderWallet,
          receiverWallet,
          10,
          true,
        ),
      );
      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: senderWallet.id,
          type: EventEnums.TRANSFER.transfer_requested,
          payload: {
            walletSender: senderWallet.name,
            walletReceiver: receiverWallet.name,
            bundle: 10,
            transferState: 'pending',
            claim: true,
          },
        }),
      ).eql(true);

      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: receiverWallet.id,
          type: EventEnums.TRANSFER.transfer_requested,
          payload: {
            walletSender: senderWallet.name,
            walletReceiver: receiverWallet.name,
            bundle: 10,
            transferState: 'pending',
            claim: true,
          },
        }),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
    });
  });

  describe('fulfillTransfer', () => {
    let fulfillTransferStub;
    let fulfillTransferWithTokensStub;
    let tokenServiceGetByIdStub;
    let getByIdStub;
    let getByNameStub;
    let logEventStub;

    const originator_wallet_id = {
      id: 'id',
    };

    const destination_wallet_id = { id: 'id' };

    const wallet_id = {
      originating_wallet: 'originating_wallet',
      destination_wallet: 'destination_wallet',
    };

    beforeEach(() => {
      fulfillTransferStub = sinon.stub(Transfer.prototype, 'fulfillTransfer');
      fulfillTransferWithTokensStub = sinon.stub(
        Transfer.prototype,
        'fulfillTransferWithTokens',
      );
      tokenServiceGetByIdStub = sinon.stub(TokenService.prototype, 'getById');
      logEventStub = sinon.stub(EventService.prototype, 'logEvent');
      getByIdStub = sinon
        .stub(Transfer.prototype, 'getById')
        .resolves(wallet_id);
      getByNameStub = sinon.stub(WalletService.prototype, 'getByName');
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
      expect(logEventStub.notCalled).to.eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.calledOnce).eql(true);
      expect(commitTransactionStub.notCalled).eql(true);
      expect(fulfillTransferWithTokensStub.notCalled).eql(true);
      expect(tokenServiceGetByIdStub.notCalled).eql(true);
    });

    it('should fulfillTransfer -- implicit', async () => {
      getByNameStub.onFirstCall().resolves(originator_wallet_id);
      getByNameStub.onSecondCall().resolves(destination_wallet_id);

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
      expect(getByIdStub.calledOnceWithExactly('transferId', 'walletLoginId'));
      expect(
        getByNameStub
          .getCall(0)
          .calledWithExactly(wallet_id.originating_wallet),
      );
      expect(
        getByNameStub
          .getCall(1)
          .calledWithExactly(wallet_id.destination_wallet),
      );
      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: originator_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_completed,
          payload: { result },
        }),
      ).eql(true);

      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: destination_wallet_id.id,
          type: EventEnums.TRANSFER.transfer_completed,
          payload: { result },
        }),
      ).eql(true);
      expect(beginTransactionStub.calledOnce).eql(true);
      expect(rollbackTransactionStub.notCalled).eql(true);
      expect(commitTransactionStub.calledOnce).eql(true);
      expect(fulfillTransferWithTokensStub.notCalled).eql(true);
      expect(tokenServiceGetByIdStub.notCalled).eql(true);
    });

    it('should fulfillTransfer -- tokens', async () => {
      getByNameStub.onFirstCall().resolves(originator_wallet_id);
      getByNameStub.onSecondCall().resolves(destination_wallet_id);

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
      expect(getByIdStub.calledOnceWithExactly('transferId', 'walletLoginId'));
      expect(
        getByNameStub
          .getCall(0)
          .calledWithExactly(wallet_id.originating_wallet),
      );
      expect(
        getByNameStub
          .getCall(1)
          .calledWithExactly(wallet_id.destination_wallet),
      );
      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: originator_wallet_id.id,
          type: 'transfer_completed',
          payload: { result, tokens: ['token1', 'token2'] },
        }),
      ).eql(true);

      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: destination_wallet_id.id,
          type: 'transfer_completed',
          payload: { result, tokens: ['token1', 'token2'] },
        }),
      ).eql(true);
    });
  });
});
