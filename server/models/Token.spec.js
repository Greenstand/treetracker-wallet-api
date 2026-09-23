const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const chai = require('chai');
const { v4: uuid } = require('uuid');

chai.use(sinonChai);
const { expect } = chai;
const Session = require('../infra/database/Session');
const TokenRepository = require('../repositories/TokenRepository');
const TransactionRepository = require('../repositories/TransactionRepository');
const Token = require('./Token');

describe('Token Model', () => {
  let tokenModel;
  let tokenRepositoryStub;
  let transactionRepositoryStub;

  beforeEach(() => {
    const session = new Session();
    tokenModel = new Token(session);

    tokenRepositoryStub = sinon.stub(TokenRepository.prototype);
    transactionRepositoryStub = sinon.stub(TransactionRepository.prototype);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('countTokenByWallet', async () => {
    const walletId = uuid();
    tokenRepositoryStub.countByFilter.resolves(44);
    const result = await tokenModel.countTokenByWallet(walletId);
    expect(result).eql(44);
    expect(tokenRepositoryStub.countByFilter).calledOnceWithExactly({
      wallet_id: walletId,
    });
  });

  it('countNotClaimedTokenByWallet', async () => {
    const walletId = uuid();
    tokenRepositoryStub.countByFilter.resolves(55);
    const result = await tokenModel.countNotClaimedTokenByWallet(walletId);
    expect(result).eql(55);
    expect(tokenRepositoryStub.countByFilter).calledOnceWithExactly({
      wallet_id: walletId,
      claim: false,
    });
  });

  it('getTokensByBundle', async () => {
    const walletId = uuid();
    tokenRepositoryStub.getByFilter.resolves(['token1', 'token2']);
    const result = await tokenModel.getTokensByBundle(walletId, 20, true);
    expect(result).eql(['token1', 'token2']);
    expect(tokenRepositoryStub.getByFilter).calledOnceWithExactly(
      {
        wallet_id: walletId,
        transfer_pending: false,
      },
      {
        limit: 20,
        claim: true,
      },
    );
  });

  it('completeTransfer', async () => {
    const tokens = [{ id: uuid() }, { id: uuid() }];
    const transfer = {
      id: uuid(),
      destination_wallet_id: uuid(),
      source_wallet_id: uuid(),
    };
    tokenRepositoryStub.updateByIds.resolves();
    transactionRepositoryStub.batchCreate.resolves();

    await tokenModel.completeTransfer(tokens, transfer, true);
    expect(tokenRepositoryStub.updateByIds).calledOnceWithExactly(
      {
        transfer_pending: false,
        transfer_pending_id: null,
        wallet_id: transfer.destination_wallet_id,
        claim: true,
      },
      tokens.map((token) => token.id),
    );
    expect(transactionRepositoryStub.batchCreate).calledOnceWithExactly(
      tokens.map((token) => ({
        token_id: token.id,
        transfer_id: transfer.id,
        source_wallet_id: transfer.source_wallet_id,
        destination_wallet_id: transfer.destination_wallet_id,
        claim: true,
      })),
    );
  });

  it('pendingTransfer', async () => {
    const tokens = [{ id: uuid() }, { id: uuid() }];
    const transfer = {
      id: uuid(),
      destination_wallet_id: uuid(),
      source_wallet_id: uuid(),
    };
    tokenRepositoryStub.updateByIds.resolves();
    await tokenModel.pendingTransfer(tokens, transfer);
    expect(tokenRepositoryStub.updateByIds).calledOnceWithExactly(
      {
        transfer_pending: true,
        transfer_pending_id: transfer.id,
      },
      tokens.map((token) => token.id),
    );
  });

  it('cancelTransfer', async () => {
    const tokens = [{ id: uuid() }, { id: uuid() }];
    tokenRepositoryStub.updateByIds.resolves();
    await tokenModel.cancelTransfer(tokens);
    expect(tokenRepositoryStub.updateByIds).calledOnceWithExactly(
      {
        transfer_pending: false,
        transfer_pending_id: null,
      },
      tokens.map((token) => token.id),
    );
  });

  describe('belongsTo', async () => {
    it('should return true', async () => {
      const walletId = uuid();
      const result = Token.belongsTo({ wallet_id: walletId }, walletId);
      expect(result).eql(true);
    });

    it('should return false', async () => {
      const walletId = uuid();
      const result = Token.belongsTo({ wallet_id: uuid() }, walletId);
      expect(result).eql(false);
    });
  });

  describe('beAbleToTransfer', async () => {
    it('should return true', async () => {
      const result = Token.beAbleToTransfer({ transfer_pending: false });
      expect(result).eql(true);
    });

    it('should return false', async () => {
      const result = Token.beAbleToTransfer({ transfer_pending: true });
      expect(result).eql(false);
    });
  });

  it('getTransactions', async () => {
    transactionRepositoryStub.getByFilter.resolves([
      'transaction1',
      'transaction2',
    ]);
    const tokenId = uuid();

    const result = await tokenModel.getTransactions({
      limit: 1,
      offset: 0,
      tokenId,
    });
    expect(result).eql(['transaction1', 'transaction2']);

    expect(transactionRepositoryStub.getByFilter).calledOnceWithExactly(
      { token_id: tokenId },
      { limit: 1, offset: 0 },
    );
  });

  it('getByOwner', async () => {
    const walletId = uuid();
    const captureId1 = uuid();
    const captureId2 = uuid();
    const stubbedResult = [
      { capture_id: captureId1 },
      { capture_id: captureId2 },
    ];
    tokenRepositoryStub.getByFilter.resolves(stubbedResult);

    const result = await tokenModel.getByOwner(walletId, 10, 20);
    expect(result).eql(
      stubbedResult.map((t) => {
        return {
          ...t,
          links: { capture: `/webmap/tree?uuid=${t.capture_id}` },
        };
      }),
    );
    expect(tokenRepositoryStub.getByFilter).calledOnceWithExactly(
      { wallet_id: walletId },
      { limit: 10, offset: 20 },
    );
  });

  it('getById', async () => {
    const tokenId = uuid();
    const tokenCaptureId = uuid();
    const stubbedResult = { id: tokenId, capture_id: tokenCaptureId };
    tokenRepositoryStub.getById.resolves(stubbedResult);

    const result = await tokenModel.getById(tokenId);
    expect(result).eql({
      ...stubbedResult,
      links: {
        capture: `/webmap/tree?uuid=${tokenCaptureId}`,
      },
    });
  });

  it('getTokensByPendingTransferId', async () => {
    const transferId = uuid();
    tokenRepositoryStub.getByFilter.resolves({ id: transferId });
    const result = await tokenModel.getTokensByPendingTransferId(
      transferId,
      10,
      0
    );
    expect(result).eql({ id: transferId });
    expect(tokenRepositoryStub.getByFilter).calledOnceWithExactly(
      { transfer_pending_id: transferId },
      { limit: 10, offset: 0 },
    );
  });

  it('getTokensByTransferId', async () => {
    const transferId = uuid();
    tokenRepositoryStub.getByTransferId.resolves({ id: transferId });
    const result = await tokenModel.getTokensByTransferId(transferId, 10, 20);
    expect(result).eql({ id: transferId });
    expect(tokenRepositoryStub.getByTransferId).calledOnceWithExactly(
      transferId,
      10,
      20,
    );
  });
});
