const sinon = require('sinon');
const { expect } = require('chai');
const TokenService = require('./TokenService');
const Wallet = require('../models/Wallet');
const Token = require('../models/Token');
const WalletService = require('./WalletService');

describe('Token', () => {
  let tokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('getTokensByPendingTransferId', async () => {
    const getTokensByPendingTransferIdStub = sinon
      .stub(Token.prototype, 'getTokensByPendingTransferId')
      .resolves('token');

    const token = await tokenService.getTokensByPendingTransferId(
      'transferId',
      10,
      10,
    );
    expect(token).eql('token');
    expect(
      getTokensByPendingTransferIdStub.calledOnceWithExactly(
        'transferId',
        10,
        10,
      ),
    ).eql(true);
  });

  it('getTokensByTransferId', async () => {
    const getTokensByTransferIdStub = sinon
      .stub(Token.prototype, 'getTokensByTransferId')
      .resolves('token');

    const token = await tokenService.getTokensByTransferId(
      'transferId',
      10,
      10,
    );
    expect(token).eql('token');
    expect(
      getTokensByTransferIdStub.calledOnceWithExactly('transferId', 10, 10),
    ).eql(true);
  });

  it('countNotClaimedTokenByWallet', async () => {
    const countNotClaimedTokenByWalletStub = sinon
      .stub(Token.prototype, 'countNotClaimedTokenByWallet')
      .resolves(10);

    const count = await tokenService.countNotClaimedTokenByWallet('walletId');
    expect(count).eql(10);
    expect(
      countNotClaimedTokenByWalletStub.calledOnceWithExactly('walletId'),
    ).eql(true);
  });

  it('countTokenByWallet', async () => {
    const countTokenByWalletStub = sinon
      .stub(Token.prototype, 'countTokenByWallet')
      .resolves(10);

    const count = await tokenService.countTokenByWallet('walletId');
    expect(count).eql(10);
    expect(countTokenByWalletStub.calledOnceWithExactly('walletId')).eql(true);
  });

  it('getTransactions', async () => {
    const getTransactionsStub = sinon
      .stub(Token.prototype, 'getTransactions')
      .resolves(['transactions']);

    const getByIdServiceStub = sinon.stub(TokenService.prototype, 'getById');

    const transactions = await tokenService.getTransactions({
      limit: 1,
      offset: 1,
      tokenId: 'tokenId',
      walletLoginId: 'walletLoginId',
    });
    expect(transactions).eql(['transactions']);
    expect(
      getTransactionsStub.calledOnceWithExactly({
        limit: 1,
        offset: 1,
        tokenId: 'tokenId',
      }),
    ).eql(true);
    expect(
      getByIdServiceStub.calledOnceWithExactly({
        id: 'tokenId',
        walletLoginId: 'walletLoginId',
      }),
    ).eql(true);
  });

  describe('getTokens', () => {
    let getByNameStub;
    let getByOwnerStub;
    let hasControlOverStub;

    beforeEach(() => {
      getByNameStub = sinon
        .stub(Wallet.prototype, 'getByName')
        .resolves({ id: 'walletId' });

      hasControlOverStub = sinon.stub(Wallet.prototype, 'hasControlOver');

      getByOwnerStub = sinon
        .stub(Token.prototype, 'getByOwner')
        .resolves(['tokens']);
    });

    it('getToken with walletLoginId', async () => {
      const tokens = await tokenService.getTokens({
        walletLoginId: 'walletLoginId',
        limit: 1,
        offset: 1,
      });
      expect(tokens).eql(['tokens']);
      expect(getByNameStub.notCalled).eql(true);
      expect(hasControlOverStub.notCalled).eql(true);
      expect(getByOwnerStub.calledOnceWithExactly('walletLoginId', 1, 1)).eql(
        true,
      );
    });

    it('getToken with wallet -- no control over', async () => {
      hasControlOverStub.resolves(false);
      let error;
      try {
        await tokenService.getTokens({
          wallet: 'wallet',
          walletLoginId: 'walletLoginId',
          limit: 1,
          offset: 1,
        });
      } catch (e) {
        error = e;
      }
      expect(error?.message).eql(
        'Wallet does not belong to the logged in wallet',
      );
      expect(error?.code).eql(403);
      expect(getByNameStub.calledOnceWithExactly('wallet')).eql(true);
      expect(
        hasControlOverStub.calledOnceWithExactly('walletLoginId', 'walletId'),
      ).eql(true);
      expect(getByOwnerStub.notCalled).eql(true);
    });

    it('getToken with wallet', async () => {
      hasControlOverStub.resolves(true);
      await tokenService.getTokens({
        wallet: 'wallet',
        walletLoginId: 'walletLoginId',
        limit: 1,
        offset: 1,
      });
      expect(getByNameStub.calledOnceWithExactly('wallet')).eql(true);
      expect(
        hasControlOverStub.calledOnceWithExactly('walletLoginId', 'walletId'),
      ).eql(true);
      expect(getByOwnerStub.calledOnceWithExactly('walletId', 1, 1)).eql(true);
    });
  });

  describe('getById', () => {
    let getByIdStub;
    let getAllWalletsStub;

    beforeEach(() => {
      getByIdStub = sinon
        .stub(Token.prototype, 'getById')
        .resolves({ id: 'id', wallet_id: 'wallet_id' });
      getAllWalletsStub = sinon.stub(WalletService.prototype, 'getAllWallets');
    });

    it('getById with permission check -- without required permission', async () => {
      let error;
      getAllWalletsStub.resolves([]);
      try {
        await tokenService.getById({
          id: 'tokenId',
          walletLoginId: 'walletLoginId',
        });
      } catch (e) {
        error = e;
      }
      expect(error.code).eql(401);
      expect(error.message).eql('Have no permission to visit this token');
      expect(getByIdStub.calledOnceWithExactly('tokenId')).eql(true);
      expect(getAllWalletsStub.calledOnceWithExactly('walletLoginId')).eql(
        true,
      );
    });

    it('getById with permission check -- with required permission', async () => {
      getAllWalletsStub.resolves([{ id: 'wallet_id' }]);
      const token = await tokenService.getById({
        id: 'tokenId',
        walletLoginId: 'walletLoginId',
      });
      expect(token).eql({ id: 'id', wallet_id: 'wallet_id' });
      expect(getByIdStub.calledOnceWithExactly('tokenId')).eql(true);
      expect(getAllWalletsStub.calledOnceWithExactly('walletLoginId')).eql(
        true,
      );
    });

    it('getById without permission check', async () => {
      const token = await tokenService.getById(
        { id: 'tokenId', walletLoginId: 'walletLoginId' },
        true,
      );
      expect(token).eql({ id: 'id', wallet_id: 'wallet_id' });
      expect(getByIdStub.calledOnceWithExactly('tokenId')).eql(true);
    });
  });
});
