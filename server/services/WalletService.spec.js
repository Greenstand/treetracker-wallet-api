const sinon = require('sinon');
const { expect } = require('chai');
const uuid = require('uuid');
const WalletService = require('./WalletService');
const Wallet = require('../models/Wallet');
const Session = require('../infra/database/Session');
const Token = require('../models/Token');

describe('WalletService', () => {
  let walletService;

  beforeEach(() => {
    walletService = new WalletService();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('getById', async () => {
    const walletId1 = uuid.v4();
    sinon
      .stub(Wallet.prototype, 'getById')
      .resolves({ id: walletId1, name: 'walletId1' });
    expect(walletService).instanceOf(WalletService);
    const wallet = await walletService.getById(walletId1);
    expect(wallet.id).eql(walletId1);
    expect(wallet.name).eql('walletId1');
    Wallet.prototype.getById.restore();
  });

  it('getWallet', async () => {
    const walletId1 = uuid.v4();
    sinon
      .stub(Wallet.prototype, 'getWallet')
      .resolves({ id: walletId1, name: 'walletId1' });
    expect(walletService).instanceOf(WalletService);
    const wallet = await walletService.getWallet(walletId1);
    expect(wallet.id).eql(walletId1);
    expect(wallet.name).eql('walletId1');
    Wallet.prototype.getWallet.restore();
  });

  it('getByName', async () => {
    const walletId1 = uuid.v4();
    sinon
      .stub(Wallet.prototype, 'getByName')
      .resolves({ id: walletId1, name: 'test' });
    expect(walletService).instanceOf(WalletService);
    const wallet = await walletService.getByName('test');
    expect(wallet.id).eql(walletId1);
    expect(wallet.name).eql('test');
    Wallet.prototype.getByName.restore();
  });

  it('hasControlOver', async () => {
    const walletId1 = uuid.v4();
    const walletId2 = uuid.v4();
    const hasControlOverStub = sinon
      .stub(Wallet.prototype, 'hasControlOver')
      .resolves(false);
    expect(walletService).instanceOf(WalletService);
    const hasControlOver = await walletService.hasControlOver(
      walletId1,
      walletId2,
    );
    expect(hasControlOver).eql(false);
    expect(hasControlOverStub.calledOnceWithExactly(walletId1, walletId2)).eql(
      true,
    );
    hasControlOverStub.restore();
  });

  it('getSubWallets', async () => {
    const walletId1 = uuid.v4();
    const getSubWalletsStub = sinon
      .stub(Wallet.prototype, 'getSubWallets')
      .resolves(['wallet1', 'wallet2']);
    expect(walletService).instanceOf(WalletService);
    const subWallets = await walletService.getSubWallets(walletId1);
    expect(subWallets).eql(['wallet1', 'wallet2']);
    expect(getSubWalletsStub.calledOnceWithExactly(walletId1)).eql(true);
    getSubWalletsStub.restore();
  });

  describe('getByIdOrName', () => {
    const walletId = uuid.v4();
    const walletName = 'walletName';
    let getByIdStub;
    let getByNameStub;

    beforeEach(() => {
      getByIdStub = sinon
        .stub(WalletService.prototype, 'getById')
        .resolves({ id: walletId, name: 'walletName' });

      getByNameStub = sinon
        .stub(WalletService.prototype, 'getByName')
        .resolves({ id: walletId, name: 'walletName' });
    });

    it('sending a name as the parameter', async () => {
      expect(walletService).instanceOf(WalletService);
      const wallet = await walletService.getByIdOrName(walletName);
      expect(getByNameStub.calledOnceWithExactly(walletName)).eql(true);
      expect(getByIdStub.notCalled).eql(true);
      expect(wallet.name).eql('walletName');
      expect(wallet.id).eql(walletId);
    });

    it('sending an id as the parameter', async () => {
      expect(walletService).instanceOf(WalletService);
      const wallet2 = await walletService.getByIdOrName(walletId);
      expect(getByIdStub.calledOnceWithExactly(walletId)).eql(true);
      expect(getByNameStub.notCalled).eql(true);
      expect(wallet2.name).eql('walletName');
      expect(wallet2.id).eql(walletId);
    });
  });

  describe('createWallet', () => {
    let sessionBeginTransactionStub;
    let sessionCommitTransactionStub;
    let sessionRollbackTransactionStub;
    let sessionIsTransactionInProgressStub;
    let createWalletStub;

    beforeEach(() => {
      sessionIsTransactionInProgressStub = sinon.stub(
        Session.prototype,
        'isTransactionInProgress',
      );

      sessionBeginTransactionStub = sinon
        .stub(Session.prototype, 'beginTransaction')
        .callsFake(async () =>
          sessionIsTransactionInProgressStub.returns(true),
        );

      sessionCommitTransactionStub = sinon.stub(
        Session.prototype,
        'commitTransaction',
      );

      sessionRollbackTransactionStub = sinon.stub(
        Session.prototype,
        'rollbackTransaction',
      );

      createWalletStub = sinon.stub(Wallet.prototype, 'createWallet');
    });

    it('should rollback transaction if it errors out', async () => {
      createWalletStub.rejects();
      expect(walletService).instanceOf(WalletService);
      const loggedInWalletId = uuid.v4();
      const wallet = 'wallet';
      try {
        await walletService.createWallet(loggedInWalletId, wallet);
      } catch (e) {}
      expect(
        createWalletStub.calledOnceWithExactly(loggedInWalletId, wallet),
      ).eql(true);
      expect(sessionBeginTransactionStub.calledOnce).eql(true);
      expect(sessionRollbackTransactionStub.calledOnce).eql(true);
      expect(sessionCommitTransactionStub.notCalled).eql(true);
    });

    it('should create wallet', async () => {
      const loggedInWalletId = uuid.v4();
      const wallet = 'wallet';
      const walletId = uuid.v4();
      createWalletStub.resolves({ name: wallet, id: walletId });
      expect(walletService).instanceOf(WalletService);
      const createdWallet = await walletService.createWallet(
        loggedInWalletId,
        wallet,
      );
      expect(createdWallet).eql({ wallet, id: walletId });
      expect(
        createWalletStub.calledOnceWithExactly(loggedInWalletId, wallet),
      ).eql(true);
      expect(sessionBeginTransactionStub.calledOnce).eql(true);
      expect(sessionCommitTransactionStub.calledOnce).eql(true);
      expect(sessionRollbackTransactionStub.notCalled).eql(true);
    });
  });

  describe('getAllWallets', () => {
    const walletId1 = uuid.v4();
    const walletId2 = uuid.v4();
    const limitOptions = {
      limit: 10,
      offet: 0,
    };
    const result = [
      {
        id: walletId1,
        name: 'walletName',
      },
      {
        id: walletId2,
        name: 'walletName2',
      },
    ];
    let getAllWalletsStub;

    beforeEach(() => {
      getAllWalletsStub = sinon
        .stub(Wallet.prototype, 'getAllWallets')
        .resolves(result);
    });

    it('getAllWallets without getTokenCount', async () => {
      const id = uuid.v4();
      const allWallets = await walletService.getAllWallets(
        id,
        limitOptions,
        '',
        false,
      );

      expect(getAllWalletsStub.calledOnceWithExactly(id, limitOptions)).eql(
        true,
      );
      expect(allWallets).eql(result);
    });

    it('getAllWallets with getTokenCount', async () => {
      const id = uuid.v4();
      const countTokenByWalletStub = sinon.stub(
        Token.prototype,
        'countTokenByWallet',
      );
      countTokenByWalletStub.onFirstCall().resolves(2);
      countTokenByWalletStub.onSecondCall().resolves(4);
      const allWallets = await walletService.getAllWallets(
        id,
        {
          limit: 10,
          offet: 0,
        },
        '',
      );
      expect(countTokenByWalletStub.calledTwice).eql(true);
      expect(
        countTokenByWalletStub.getCall(0).calledWithExactly(walletId1),
      ).eql(true);
      expect(
        countTokenByWalletStub.getCall(1).calledWithExactly(walletId2),
      ).eql(true);
      expect(allWallets).eql([
        {
          id: walletId1,
          name: 'walletName',
          tokens_in_wallet: 2,
        },
        {
          id: walletId2,
          name: 'walletName2',
          tokens_in_wallet: 4,
        },
      ]);
    });
  });

  describe('getAllWalletsCount', () => {
    const walletId1 = uuid.v4();
    const walletId2 = uuid.v4();
    let getAllWalletsCountStub;

    const result = [
      {
        id: walletId1,
        name: 'walletName',
      },
      {
        id: walletId2,
        name: 'walletName2',
      },
    ];

    beforeEach(() => {
      getAllWalletsCountStub = sinon
        .stub(WalletService.prototype, 'getAllWalletsCount')
        .resolves(result);
    });

    it('sending an id as a parameter', async () => {
      expect(walletService).instanceOf(WalletService);

      const allWallets = await walletService.getAllWalletsCount(walletId1);

      expect(getAllWalletsCountStub.calledOnceWithExactly(walletId1)).eql(true);
      expect(allWallets).eql(result);
    });

    it('sending an id and name as parameters', async () => {
      const filterName = 'walletName';
      expect(walletService).instanceOf(WalletService);

      const allWallets = await walletService.getAllWalletsCount(
        walletId1,
        filterName,
      );

      expect(
        getAllWalletsCountStub.calledOnceWithExactly(walletId1, filterName),
      ).eql(true);
      expect(allWallets).eql(result);
    });
  });
});
