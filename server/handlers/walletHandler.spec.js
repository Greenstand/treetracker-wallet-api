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
        .resolves([{ id: trustRelationshipId }]);
      const res = await request(app).get(
        `/wallets/${walletId}/trust_relationships?state=${TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested}`,
      );
      expect(res).property('statusCode').eq(200);
      expect(res.body.trust_relationships).lengthOf(1);
      expect(res.body.trust_relationships[0].id).eql(trustRelationshipId);
      expect(
        getTrustRelationshipsStub.calledOnceWithExactly({
          walletId,
          state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
          type: undefined,
          request_type: undefined,
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
      expect(getWalletStub.calledOnceWithExactly(walletId)).eql(true);
    });
  });

  describe('post /wallets', () => {
    const walletId = uuid.v4();
    const mockWallet = { id: walletId, wallet: 'test-wallet-2' };

    it('successfully creates managed wallet', async () => {
      const createWalletStub = sinon
        .stub(WalletService.prototype, 'createWallet')
        .resolves(mockWallet);
      const res = await request(app).post('/wallets').send({
        wallet: mockWallet.wallet,
      });
      expect(res).property('statusCode').eq(200);
      expect(res.body.wallet).eq(mockWallet.wallet);
      expect(res.body.id).eq(mockWallet.id);
      expect(
        createWalletStub.calledOnceWithExactly(
          authenticatedWalletId,
          mockWallet.wallet,
        ),
      ).eql(true);
    });

    it('missed parameter', async () => {
      const res = await request(app).post('/wallets').send({});
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/wallet.*required/);
    });
  });
});
