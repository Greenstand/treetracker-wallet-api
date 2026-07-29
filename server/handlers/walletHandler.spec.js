const request = require('supertest');
const express = require('express');
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const uuid = require('uuid');
const walletRouter = require('../routes/walletRouter');
const { errorHandler } = require('../utils/utils');

chai.use(sinonChai);
const { expect } = chai;
const ApiKeyService = require('../services/ApiKeyService');
const WalletService = require('../services/WalletService');
const TrustService = require('../services/TrustService');
const JWTService = require('../services/JWTService');
const TrustRelationshipEnums = require('../utils/trust-enums');

describe('walletRouter', () => {
  let app;
  const authenticatedWalletId = uuid.v4();

  beforeEach(() => {
    sinon.stub(ApiKeyService.prototype, 'check');
    sinon.stub(JWTService, 'verify').returns({
      id: authenticatedWalletId,
    });
    app = express();
    app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(express.json()); // parse application/json
    app.use(walletRouter);
    app.use(errorHandler);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('get /wallets', () => {
    it('no limit parameter(1000 as default)', async () => {
      const res = await request(app).get('/wallets');
      expect(res).property('statusCode').eq(200);
    });

    it('successfully', async () => {
      const walletId = uuid.v4();
      const getAllWalletsStub = sinon
        .stub(WalletService.prototype, 'getAllWallets')
        .resolves({ wallets: [{ id: walletId }], count: 1 });

      const res = await request(app).get('/wallets?limit=2');

      expect(res).property('statusCode').eq(200);
      expect(res.body.wallets).lengthOf(1);
      expect(res.body.wallets[0]).property('id').eq(walletId);
      expect(res.body.total).eq(1);
      expect(
        getAllWalletsStub.calledOnceWithExactly(
          authenticatedWalletId,
          {
            limit: '2',
            offset: undefined,
          },
          '',
        ),
      );
    });
  });

  describe('get /wallets/:wallet_id/trust_relationships', () => {
    const walletId = uuid.v4();
    const trustRelationshipId = uuid.v4();

    it('walletId should be guid', async () => {
      const res = await request(app).get(
        `/wallets/walletId/trust_relationships`,
      );
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/wallet_id.*GUID/);
    });

    it('wrong state string should throw 422', async () => {
      const res = await request(app).get(
        `/wallets/${walletId}/trust_relationships?state=state`,
      );
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/state.*one.*of/);
    });

    it('wrong type string should throw 422', async () => {
      const res = await request(app).get(
        `/wallets/${walletId}/trust_relationships?type=type`,
      );
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/type.*one.*of/);
    });

    it('wrong request_type string should throw 422', async () => {
      const res = await request(app).get(
        `/wallets/${walletId}/trust_relationships?request_type=request_type`,
      );
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/request_type.*one.*of/);
    });

    it('successfully', async () => {
      const getTrustRelationshipsStub = sinon
        .stub(TrustService.prototype, 'getTrustRelationships')
        .resolves({result:[{ id: trustRelationshipId }], count: 1});
      const res = await request(app).get(
        `/wallets/${walletId}/trust_relationships?state=${TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested}`,
      );
      const managedWallets = [];
      expect(res).property('statusCode').eq(200);
      expect(res.body.trust_relationships).lengthOf(1);
      expect(res.body.total).eql(1);
      expect(res.body.trust_relationships[0].id).eql(trustRelationshipId);
      expect(
        getTrustRelationshipsStub.calledOnceWithExactly(authenticatedWalletId, managedWallets, {
          walletId,
          state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
          type: undefined,
          request_type: undefined,
          search: undefined,
          limit: 500, 
          offset: 0, 
          sort_by: 'created_at', 
          order: 'desc',
          exclude_managed: false
        }),
      ).eql(true);
    });
  });

  describe('get /wallets/:wallet_id', () => {
    it('walletId should be guid', async () => {
      const res = await request(app).get(`/wallets/walletId`);
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/wallet_id.*GUID/);
    });

    it('successfully', async () => {
      const walletId = uuid.v4();
      const getWalletStub = sinon
        .stub(WalletService.prototype, 'getWallet')
        .resolves({ id: walletId });
      const res = await request(app).get(`/wallets/${walletId}`);
      expect(res).property('statusCode').eq(200);
      expect(res.body).eql({ id: walletId });
      expect(
        getWalletStub.calledOnceWithExactly(authenticatedWalletId, walletId),
      ).eql(true);
    });
  });

  describe('post /wallets', () => {
    const walletId = uuid.v4();
    const mockWallet = {
      id: walletId,
      wallet: 'test-wallet-2',
      about: 'test about',
    };

    it('successfully creates managed wallet', async () => {
      const createWalletStub = sinon
        .stub(WalletService.prototype, 'createWallet')
        .resolves(mockWallet);
      const res = await request(app).post('/wallets').send({
        wallet: mockWallet.wallet,
        about: mockWallet.about,
      });
      expect(res).property('statusCode').eq(201);
      expect(res.body.wallet).eq(mockWallet.wallet);
      expect(res.body.id).eq(mockWallet.id);
      expect(res.body.about).eq(mockWallet.about);
      expect(
        createWalletStub.calledOnceWithExactly(
          authenticatedWalletId,
          mockWallet.wallet,
          mockWallet.about,
        ),
      ).eql(true);
    });

    it('missed parameter', async () => {
      const res = await request(app).post('/wallets').send({});
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/wallet.*required/);
    });
  });

  describe('post /wallet/batch-create-wallet', () => {

    const mockCsvContent = `wallet_name,token_transfer_amount_overwrite,extra_wallet_data_about,extra_wallet_data_cover_url,extra_wallet_data_logo_url
                            wallet1,5,about wallet1,,
                            wallet2,,about wallet2,wallet2 cover url,wallet2 logo url`;
    const mock_file_path = "mockfile.csv";
    const mock_sender_wallet = "wallet";
    const token_transfer_amount_default = 10;
    
    it('successfully creates wallets', async () => {
      
      const mockCsvJson = [
        { wallet_name: "wallet1", 
          token_transfer_amount_overwrite: 5, 
          extra_wallet_data_about: "about wallet1",
          extra_wallet_data_cover_url: '',
          extra_wallet_data_logo_url: ''
        },
        { wallet_name: "wallet2", 
          token_transfer_amount_overwrite: '', 
          extra_wallet_data_about: "about wallet2",
          extra_wallet_data_cover_url: "wallet2 cover url",
          extra_wallet_data_logo_url: "wallet2 logo url" 
        },
      ];

      const walletBatchCreateStub = sinon
          .stub(WalletService.prototype, 'batchCreateWallet')
          .resolves({
            wallets_created: 2,
            wallets_already_exists: [],
            wallet_other_failure_count: 0,
            extra_wallet_information_saved: 0,
            extra_wallet_information_not_saved: [],
          });

      const res = await request(app)
          .post('/wallets/batch-create-wallet')
          .field('sender_wallet', mock_sender_wallet)
          .field('token_transfer_amount_default', token_transfer_amount_default)
          .attach('csv', Buffer.from(mockCsvContent), mock_file_path);

      expect(res).property('statusCode').eq(201);
      expect(walletBatchCreateStub.calledOnce).eql(true);
      expect(walletBatchCreateStub.args[0].slice(0,-1)).eql([
        mock_sender_wallet,
        token_transfer_amount_default,
        authenticatedWalletId,
        mockCsvJson
      ]);


    })

    it('missing parameter', async () => {

      const res = await request(app)
          .post('/wallets/batch-create-wallet')
          .field('token_transfer_amount_default', token_transfer_amount_default)
          .attach('csv', Buffer.from(mockCsvContent), mock_file_path);

      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/required/);
    })
  })

  describe('post /wallet/batch-transfer', () => {

    const mockCsvContent = `wallet_name,token_transfer_amount_overwrite
                            wallet1,5
                            wallet2,
                            wallet3,7`;
    const mock_file_path = "mockfile.csv";
    const mock_sender_wallet = "wallet";
    const token_transfer_amount_default = 10;
    
    
    it('successfully transfer all tokens', async () => {
      
      const mockCsvJson = [
        { wallet_name: "wallet1", 
          token_transfer_amount_overwrite: 5
        },
        { wallet_name: "wallet2", 
          token_transfer_amount_overwrite: ''
        },
        { wallet_name: "wallet3",
          token_transfer_amount_overwrite: 7
        }
      ];

      const walletBatchTransferWalletStub = sinon
          .stub(WalletService.prototype, 'batchTransferWallet')
          .resolves();

      const res = await request(app)
          .post('/wallets/batch-transfer')
          .field('sender_wallet', mock_sender_wallet)
          .field('token_transfer_amount_default', token_transfer_amount_default)
          .attach('csv', Buffer.from(mockCsvContent), mock_file_path);

      expect(res).property('statusCode').eq(200);
      expect(walletBatchTransferWalletStub.calledOnce).eql(true);
      expect(walletBatchTransferWalletStub.args[0].slice(0,-1)).eql([
        mock_sender_wallet,
        token_transfer_amount_default,
        authenticatedWalletId,
        mockCsvJson
      ]);


    })

    it('missing parameter', async () => {

      const res = await request(app)
          .post('/wallets/batch-transfer')
          .field('token_transfer_amount_default', token_transfer_amount_default)
          .attach('csv', Buffer.from(mockCsvContent), mock_file_path);

      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/required/);
    })
  })
});
