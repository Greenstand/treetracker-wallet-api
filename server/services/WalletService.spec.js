const sinon = require('sinon');
const { expect } = require('chai');
const uuid = require('uuid');
const fs = require('fs').promises;
const WalletService = require('./WalletService');
const Wallet = require('../models/Wallet');
const Session = require('../infra/database/Session');
const Token = require('../models/Token');
const Event = require('../models/Event');
const Transfer = require('../models/Transfer');
const HttpError = require('../utils/HttpError');

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
    let logEventStub;

    beforeEach(() => {
      logEventStub = sinon.stub(Event.prototype, 'logEvent');

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
        await walletService.createWallet(loggedInWalletId, wallet, null);
      } catch (e) {}
      expect(
        createWalletStub.calledOnceWithExactly(loggedInWalletId, wallet, null),
      ).eql(true);
      expect(logEventStub.notCalled).to.eql(true);
      expect(sessionBeginTransactionStub.calledOnce).eql(true);
      expect(sessionRollbackTransactionStub.calledOnce).eql(true);
      expect(sessionCommitTransactionStub.notCalled).eql(true);
    });

    it('should create wallet', async () => {
      const loggedInWalletId = uuid.v4();
      const wallet = 'wallet';
      const about = 'test about';
      const walletId = uuid.v4();
      createWalletStub.resolves({ name: wallet, id: walletId, about });
      expect(walletService).instanceOf(WalletService);
      const createdWallet = await walletService.createWallet(
        loggedInWalletId,
        wallet,
        about,
      );
      expect(createdWallet).eql({ wallet, id: walletId, about });
      expect(
        createWalletStub.calledOnceWithExactly(loggedInWalletId, wallet, about),
      ).eql(true);
      expect(sessionBeginTransactionStub.calledOnce).eql(true);
      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: walletId,
          type: 'wallet_created',
          payload: { parentWallet: loggedInWalletId, childWallet: wallet },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: loggedInWalletId,
          type: 'wallet_created',
          payload: { parentWallet: loggedInWalletId, childWallet: wallet },
        }),
      ).eql(true);
      expect(sessionCommitTransactionStub.calledOnce).eql(true);
      expect(sessionRollbackTransactionStub.notCalled).eql(true);
    });
  });

  describe('getAllWallets', () => {
    const walletId1 = uuid.v4();
    const walletId2 = uuid.v4();
    const limitOptions = {
      limit: 10,
      offset: 0,
    };
    const result = [
      {
        id: walletId1,
        name: 'walletName',
        tokens_in_wallet: 0,
      },
      {
        id: walletId2,
        name: 'walletName2',
        tokens_in_wallet: 0,
      },
    ];
    const count = 2;
    let getAllWalletsStub;

    beforeEach(() => {
      getAllWalletsStub = sinon
        .stub(Wallet.prototype, 'getAllWallets')
        .resolves({ wallets: result, count });
    });

    it('getAllWallets without getTokenCount', async () => {
      const id = uuid.v4();
      const allWallets = await walletService.getAllWallets(
        id,
        limitOptions,
        'name',
        'created_at',
        'asc',
        undefined,
        undefined,
        false,
      );
      expect(getAllWalletsStub).calledOnceWithExactly(
        id,
        limitOptions,
        'name',
        'created_at',
        'asc',
        undefined,
        undefined,
        true,
      );
      // ).eql(true);
      expect(allWallets).eql({ wallets: result, count });
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
        limitOptions,
        '',
      );
      expect(countTokenByWalletStub.calledTwice).eql(true);
      expect(
        countTokenByWalletStub.getCall(0).calledWithExactly(walletId1),
      ).eql(true);
      expect(
        countTokenByWalletStub.getCall(1).calledWithExactly(walletId2),
      ).eql(true);
      expect(allWallets).eql({
        wallets: [
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
        ],
        count: 2,
      });
    });
  });

  describe('batchCreateWallet', () => {
    
    let sessionBeginTransactionStub;
    let sessionCommitTransactionStub;
    let sessionRollbackTransactionStub;
    let sessionIsTransactionInProgressStub;

    let getByNameStub;
    let createWalletStub;
    let addWalletToMapConfigStub;
    let transferBundleStub;

    const loggedInWalletId = uuid.v4();
    const wallet1Id = uuid.v4();
    const wallet2Id = uuid.v4();

    const mockSenderWallet = { 
      id: loggedInWalletId, 
      name: 'wallet' 
    };

    const mockFilePath = 'path/to/csv';
    const tokenTransferAmountDefault = 10;

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

      getByNameStub = sinon.stub(WalletService.prototype, 'getByName');
      createWalletStub = sinon.stub(WalletService.prototype, 'createWallet');
      addWalletToMapConfigStub = sinon.stub(WalletService.prototype, 'addWalletToMapConfig');
      transferBundleStub = sinon.stub(Transfer.prototype, 'transferBundle');

      sinon.stub(Token.prototype, 'countTokenByWallet').resolves(20);
      sinon.stub(fs, 'unlink').resolves();
      
    });

    it('should successfully create wallets and transfer tokens without errors', async() => {
      
      const csvJson = [
        { wallet_name: "wallet1", 
          token_transfer_amount_overwrite: 5, 
          extra_wallet_data_about: "about wallet1",
          extra_wallet_data_cover_url: '',
          extra_wallet_data_logo_url: '' },

        { wallet_name: "wallet2", 
          token_transfer_amount_overwrite: '', 
          extra_wallet_data_about: "about wallet2",
          extra_wallet_data_cover_url: "wallet2 cover url",
          extra_wallet_data_logo_url: "wallet2 logo url" },
      ];

      const wallet1 = { id: wallet1Id, 
                        name: csvJson[0].wallet_name, 
                        about: csvJson[0].extra_wallet_data_about };
      const wallet2 = { id: wallet2Id, 
                        name: csvJson[1].wallet_name, 
                        about: csvJson[1].extra_wallet_data_about };

      expect(walletService).instanceOf(WalletService);
      getByNameStub.onCall(0).resolves(mockSenderWallet);
      getByNameStub.onCall(1).resolves(wallet1);
      getByNameStub.onCall(2).resolves(wallet2);

      // Check wallet creation
      createWalletStub.onCall(0).resolves(wallet1);
      createWalletStub.onCall(1).resolves(wallet2);
      const wallets = await walletService.batchCreateWallet(mockSenderWallet.name, 
        tokenTransferAmountDefault, mockSenderWallet.id, csvJson, mockFilePath);
      
      expect(createWalletStub.calledTwice).eql(true);
      expect(createWalletStub.firstCall.args).eql(
        [loggedInWalletId, csvJson[0].wallet_name, csvJson[0].extra_wallet_data_about]);
      expect(createWalletStub.secondCall.args).eql(
        [loggedInWalletId, csvJson[1].wallet_name, csvJson[1].extra_wallet_data_about]);

      
      // check token transfer
      expect(transferBundleStub.calledTwice).eql(true);
      expect(transferBundleStub.firstCall.args).eql(
        [loggedInWalletId, mockSenderWallet,
          wallet1, 5, false]);
      expect(transferBundleStub.secondCall.args).eql(
        [loggedInWalletId, mockSenderWallet,
          wallet2, 10, false]);


      // check extra wallet info
      expect(addWalletToMapConfigStub.calledOnceWithExactly({
        walletId: wallet2.id,
        walletLogoUrl: csvJson[1].extra_wallet_data_logo_url, 
        walletCoverUrl: csvJson[1].extra_wallet_data_cover_url,
        name: wallet2.name,
      })).eql(true);
      
      expect(wallets).eql({
        wallets_created: 2,
        wallets_already_exists: [],
        wallet_other_failure_count: 0,
        extra_wallet_information_saved: 1,
        extra_wallet_information_not_saved: [],
      });

      expect(sessionBeginTransactionStub.calledTwice).eql(true);
      expect(sessionCommitTransactionStub.calledTwice).eql(true);
      expect(sessionRollbackTransactionStub.notCalled).eql(true);

    });

    it('should rollback transaction if transfer failed', async() => {


      const csvJson = [
        { wallet_name: "wallet1", 
          token_transfer_amount_overwrite: 5, 
          extra_wallet_data_about: "about wallet1" },
        { wallet_name: "wallet2", 
          token_transfer_amount_overwrite: 5, 
          extra_wallet_data_about: "about wallet2" },
      ];

      const wallet1 = { id: wallet1Id, 
                        name: csvJson[0].wallet_name, 
                        about: csvJson[0].extra_wallet_data_about };
      const wallet2 = { id: wallet2Id, 
                        name: csvJson[1].wallet_name, 
                        about: csvJson[1].extra_wallet_data_about };

      
      expect(walletService).instanceOf(WalletService);
      getByNameStub.resolves(mockSenderWallet);

      createWalletStub.onCall(0).resolves(wallet1);
      createWalletStub.onCall(1).resolves(wallet2);
      transferBundleStub.onCall(0).resolves();
      transferBundleStub.onCall(1).rejects();
      
      try {
        await walletService.batchCreateWallet(mockSenderWallet.name, 10, loggedInWalletId, csvJson, mockFilePath);
      } catch (e) {}
      
      expect(sessionBeginTransactionStub.calledTwice).eql(true);
      expect(sessionCommitTransactionStub.calledOnce).eql(true);
      expect(sessionRollbackTransactionStub.calledOnce).eql(true);
    });

    it('should catches error count and reason if wallet creation fails', async() => {


      const csvJson = [
        { wallet_name: "wallet1", 
          token_transfer_amount_overwrite: 1, 
          extra_wallet_data_about: "about wallet1" },
        { wallet_name: "wallet2", 
          token_transfer_amount_overwrite: 1, 
          extra_wallet_data_about: "about wallet2" },
        { wallet_name: "wallet3", 
          token_transfer_amount_overwrite: '', 
          extra_wallet_data_about: "about wallet3" }
      ];

      const wallet1 = { id: wallet1Id, 
                        name: csvJson[0].wallet_name, 
                        about: csvJson[0].extra_wallet_data_about };
      const wallet2 = { id: wallet2Id, 
                        name: csvJson[1].wallet_name, 
                        about: csvJson[1].extra_wallet_data_about };

      
      expect(walletService).instanceOf(WalletService);
      getByNameStub.resolves(mockSenderWallet);

      createWalletStub.onCall(0).resolves(wallet1);
      createWalletStub.onCall(1).rejects(
        new HttpError(409, `The wallet "${wallet2.name}" already exists`));
      createWalletStub.onCall(2).rejects();
      

      const wallets = await walletService.batchCreateWallet(mockSenderWallet.name, 
        10, loggedInWalletId, csvJson, mockFilePath);
      
      expect(createWalletStub.firstCall.args).eql(
        [loggedInWalletId, csvJson[0].wallet_name, csvJson[0].extra_wallet_data_about]);
      expect(createWalletStub.secondCall.args).eql(
        [loggedInWalletId, csvJson[1].wallet_name, csvJson[1].extra_wallet_data_about]);
      expect(createWalletStub.getCall(2).args).eql(
        [loggedInWalletId, csvJson[2].wallet_name, csvJson[2].extra_wallet_data_about]);

      expect(wallets).eql({
        wallets_created: 1,
        wallets_already_exists: [`The wallet "${wallet2.name}" already exists`],
        wallet_other_failure_count: 1,
        extra_wallet_information_saved: 0,
        extra_wallet_information_not_saved: [],
      });

      expect(sessionBeginTransactionStub.calledOnce).eql(true);
      expect(sessionCommitTransactionStub.calledOnce).eql(true);
      expect(sessionRollbackTransactionStub.notCalled).eql(true);

    })
    

    it('should catches error count and reason if extra infomation addition fails', async() => {


      const csvJson = [
        { wallet_name: "wallet1", 
          token_transfer_amount_overwrite: 1, 
          extra_wallet_data_about: "about wallet1",
          extra_wallet_data_cover_url: "wallet1 cover url",
          extra_wallet_data_logo_url: "wallet1 logo url"  },
        { wallet_name: "wallet2", 
          token_transfer_amount_overwrite: 1, 
          extra_wallet_data_about: "about wallet2",
          extra_wallet_data_cover_url: "wallet2 cover url",
          extra_wallet_data_logo_url: "wallet2 logo url"  },
      ];

      const wallet1 = { id: wallet1Id, 
                        name: csvJson[0].wallet_name, 
                        about: csvJson[0].extra_wallet_data_about };
      const wallet2 = { id: wallet2Id, 
                        name: csvJson[1].wallet_name, 
                        about: csvJson[1].extra_wallet_data_about };

      
      expect(walletService).instanceOf(WalletService);
      getByNameStub.resolves(mockSenderWallet);

      createWalletStub.onCall(0).resolves(wallet1);
      createWalletStub.onCall(1).resolves(wallet2);
      addWalletToMapConfigStub.onCall(0).resolves();
      addWalletToMapConfigStub.onCall(1).rejects(new Error(`webmap config addition failed`));
      
      const wallets = await walletService.batchCreateWallet(mockSenderWallet.name, 
        10, loggedInWalletId, csvJson, mockFilePath);
      
      expect(createWalletStub.firstCall.args).eql(
        [loggedInWalletId, csvJson[0].wallet_name, csvJson[0].extra_wallet_data_about]);
      expect(createWalletStub.secondCall.args).eql(
        [loggedInWalletId, csvJson[1].wallet_name, csvJson[1].extra_wallet_data_about]);


      
      expect(addWalletToMapConfigStub.calledTwice).eql(true);
      expect(addWalletToMapConfigStub.firstCall.args[0]).eql({
        walletId: wallet1.id, 
        walletLogoUrl: csvJson[0].extra_wallet_data_logo_url, 
        walletCoverUrl: csvJson[0].extra_wallet_data_cover_url,
        name: wallet1.name,
      });
    
      expect(addWalletToMapConfigStub.secondCall.args[0]).eql({
        walletId: wallet2.id, 
        walletLogoUrl: csvJson[1].extra_wallet_data_logo_url, 
        walletCoverUrl: csvJson[1].extra_wallet_data_cover_url,
        name: wallet2.name,
      });
      
      expect(wallets).eql({
        wallets_created: 2,
        wallets_already_exists: [],
        wallet_other_failure_count: 0,
        extra_wallet_information_saved: 1,
        extra_wallet_information_not_saved: ['webmap config addition failed'],
      });

      expect(sessionBeginTransactionStub.calledTwice).eql(true);
      expect(sessionCommitTransactionStub.calledTwice).eql(true);
      expect(sessionRollbackTransactionStub.notCalled).eql(true);

    });


  });

  describe('batchTransferWallet', () => {
    let sessionBeginTransactionStub;
    let sessionCommitTransactionStub;
    let sessionRollbackTransactionStub;
    let sessionIsTransactionInProgressStub;

    let getByNameStub;
    let transferBundleStub;

    const tokenTransferAmountDefault = 10;
    const loggedInWalletId = uuid.v4();
    const wallet1Id = uuid.v4();
    const wallet2Id = uuid.v4();

    const senderWallet = { id: loggedInWalletId, name: 'wallet' };
    const filePath = 'path/to/csv';

    const csvJson = [
      { wallet_name: "wallet1", 
        token_transfer_amount_overwrite: 5, 
      },
      { wallet_name: "wallet2", 
        token_transfer_amount_overwrite: '', 
      },
    ];

    const wallet1 = { 
      id: wallet1Id, 
      name: csvJson[0].wallet_name, 
      about: csvJson[0].extra_wallet_data_about 
    };

    const wallet2 = { 
      id: wallet2Id, 
      name: csvJson[1].wallet_name, 
      about: csvJson[1].extra_wallet_data_about 
    };

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

      getByNameStub = sinon.stub(WalletService.prototype, 'getByName');
      transferBundleStub = sinon.stub(Transfer.prototype, 'transferBundle');

      sinon.stub(Token.prototype, 'countTokenByWallet').resolves(20);
      sinon.stub(fs, 'unlink').resolves();
      
    });
    

    it('should rollback if one of transactions fails', async() => {
      
      expect(walletService).instanceOf(WalletService);
      getByNameStub.onCall(0).resolves(senderWallet);
      getByNameStub.onCall(1).resolves(wallet1);
      getByNameStub.onCall(2).resolves(wallet2);

      transferBundleStub.onCall(0).resolves();
      transferBundleStub.onCall(1).rejects();

      try {
        await walletService.batchTransferWallet(
          senderWallet.name, tokenTransferAmountDefault, loggedInWalletId, csvJson, filePath);
      } catch (e) {}

      expect(transferBundleStub.calledTwice).eql(true);
      expect(transferBundleStub.firstCall.args).eql([
        loggedInWalletId, senderWallet, wallet1, 5, false
      ]);
      expect(transferBundleStub.secondCall.args).eql([
        loggedInWalletId, senderWallet, wallet2, 10, false
      ]);

      expect(sessionBeginTransactionStub.calledOnce).eql(true);
      expect(sessionCommitTransactionStub.notCalled).eql(true);
      expect(sessionRollbackTransactionStub.calledOnce).eql(true);

    });

    it('all transactions success', async() => {
      
      expect(walletService).instanceOf(WalletService);
      getByNameStub.onCall(0).resolves(senderWallet);
      getByNameStub.onCall(1).resolves(wallet1);
      getByNameStub.onCall(2).resolves(wallet2);

      transferBundleStub.onCall(0).resolves();
      transferBundleStub.onCall(1).resolves();

      const result = await walletService.batchTransferWallet(
        senderWallet.name, tokenTransferAmountDefault, loggedInWalletId, csvJson, filePath);

      expect(transferBundleStub.calledTwice).eql(true);
      expect(transferBundleStub.firstCall.args).eql([
        loggedInWalletId, senderWallet, wallet1, 5, false
      ]);
      expect(transferBundleStub.secondCall.args).eql([
        loggedInWalletId, senderWallet, wallet2, 10, false
      ]);

      expect(sessionBeginTransactionStub.calledOnce).eql(true);
      expect(sessionCommitTransactionStub.calledOnce).eql(true);
      expect(sessionRollbackTransactionStub.notCalled).eql(true);

      expect(result.message).eql('Batch transfer successful');
    });


  });


  describe('hasControlOverByName', () => {
    let getByNameStub;
    let hasControlOverStub;


    const parentId = uuid.v4();
    const childId = uuid.v4();
    const childName = 'childWallet';

    const walletInstance = {
        id: childId, 
        name: childName
    };
  

    beforeEach(() => {

      getByNameStub = sinon.stub(WalletService.prototype, 'getByName');
      hasControlOverStub = sinon.stub(WalletService.prototype, 'hasControlOver');

    });

    it('should error out -- wallet does not belong to the logged in wallet', async () => {

      expect(walletService).instanceOf(WalletService);
      getByNameStub.resolves(walletInstance);
      hasControlOverStub.resolves(false);
      
      try {
        await walletService.hasControlOverByName(parentId, childName);
      } catch (error) {
        expect(error).instanceOf(HttpError);
        expect(error.message).eql('Wallet does not belong to the logged in wallet');
      }
    
      
      expect(getByNameStub.calledOnceWithExactly(walletInstance.name)).eql(true);
      expect(hasControlOverStub.calledOnceWithExactly(parentId, childId)).eql(true);

    });

    it('successful', async() => {

      expect(walletService).instanceOf(WalletService);
      getByNameStub.resolves(walletInstance);
      hasControlOverStub.resolves(true);
      
      const result = await walletService.hasControlOverByName(parentId, childName);
      
      expect(getByNameStub.calledOnceWithExactly(walletInstance.name)).eql(true);
      expect(hasControlOverStub.calledOnceWithExactly(parentId, childId)).eql(true);
      expect(result).eql(walletInstance);


    });

  });

});
