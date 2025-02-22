const request = require('supertest');
const express = require('express');
const { expect } = require('chai');
const sinon = require('sinon');
const uuid = require('uuid');
const tokenRouter = require('../routes/tokenRouter');
const { errorHandler } = require('../utils/utils');
const JWTService = require('../services/JWTService');
const TokenService = require('../services/TokenService');

describe('tokenRouter', () => {
  let app;
  const authenticatedWallet = {
    id: uuid.v4(),
  };

  beforeEach(() => {
    sinon.stub(JWTService, 'verify').returns({
      id: authenticatedWallet.id,
    });
    app = express();
    app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(express.json()); // parse application/json
    app.use(tokenRouter);
    app.use(errorHandler);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('get tokens, GET /', () => {
    const tokenId = uuid.v4();
    const token2Id = uuid.v4();
    const walletId = uuid.v4();
    const wallet2Id = uuid.v4();
    const captureId = uuid.v4();
    const capture2Id = uuid.v4();

    const token = {
      id: tokenId,
      wallet_id: walletId,
      capture_id: captureId,
      links: { capture: `/webmap/tree?uuid=${captureId}` },
    };
    const token2 = {
      id: token2Id,
      wallet_id: wallet2Id,
      capture_id: capture2Id,
      links: { capture: `/webmap/tree?uuid=${capture2Id}` },
    };

    it('successfully, no wallet query', async () => {
      const getByTokensStub = sinon
        .stub(TokenService.prototype, 'getTokens')
        .resolves([token2]);
      const res = await request(app).get('/tokens?limit=10&offset=1');
      expect(res).property('statusCode').eq(200);
      expect(res.body.tokens).lengthOf(1);
      expect(res.body.tokens[0]).property('id').eq(token2Id);
      expect(res.body.tokens[0])
        .property('links')
        .property('capture')
        .eq(`/webmap/tree?uuid=${capture2Id}`);
      expect(
        getByTokensStub.calledOnceWithExactly({
          wallet: undefined,
          limit: 10,
          offset: 1,
          walletLoginId: authenticatedWallet.id,
        }),
      ).eql(true);
    });

    it('successfully,  wallet', async () => {
      const getByTokensStub = sinon
        .stub(TokenService.prototype, 'getTokens')
        .resolves([token]);
      const res = await request(app).get(`/tokens?limit=10&wallet=${walletId}`);
      expect(res).property('statusCode').eq(200);
      expect(res.body.tokens).lengthOf(1);
      expect(res.body.tokens[0]).property('id').eq(tokenId);
      expect(res.body.tokens[0])
        .property('links')
        .property('capture')
        .eq(`/webmap/tree?uuid=${captureId}`);
      expect(
        getByTokensStub.calledOnceWithExactly({
          wallet: walletId,
          limit: 10,
          offset: 0,
          walletLoginId: authenticatedWallet.id,
        }),
      ).eql(true);
    });
  });

  it('/test-uuid successfully', async () => {
    const tokenId = uuid.v4();
    const walletId = uuid.v4();
    const captureId = uuid.v4();
    const token = {
      id: tokenId,
      wallet_id: walletId,
      capture_id: captureId,
      links: { capture: `/webmap/tree?uuid=${captureId}` },
    };
    const getByIdStub = sinon
      .stub(TokenService.prototype, 'getById')
      .resolves(token);

    const res = await request(app).get(`/tokens/${tokenId}`);
    expect(res).property('statusCode').eq(200);
    expect(res.body).property('id').eq(tokenId);
    expect(res.body)
      .property('links')
      .property('capture')
      .eq(`/webmap/tree?uuid=${captureId}`);
    expect(
      getByIdStub.calledOnceWithExactly({
        id: tokenId,
        walletLoginId: authenticatedWallet.id,
      }),
    ).eql(true);
  });

  describe('get token, GET /:token_id/transactions', () => {
    const tokenId = uuid.v4();
    const walletId = uuid.v4();
    const wallet2Id = uuid.v4();

    const token = {
      token: tokenId,
      sender_wallet: walletId,
      receiver_wallet: wallet2Id,
    };

    it('/xxx/transactions successfully', async () => {
      const getTransactionsStub = sinon
        .stub(TokenService.prototype, 'getTransactions')
        .resolves([token]);
      const res = await request(app).get(
        `/tokens/${tokenId}/transactions/?limit=1`,
      );
      expect(res).property('statusCode').eq(200);
      expect(res.body.history).lengthOf(1);
      expect(res.body.history[0]).property('token').eq(tokenId);
      expect(res.body.history[0]).property('sender_wallet').eq(walletId);
      expect(res.body.history[0]).property('receiver_wallet').eq(wallet2Id);
      expect(
        getTransactionsStub.calledOnceWithExactly({
          tokenId,
          limit: 1,
          offset: 0,
          walletLoginId: authenticatedWallet.id,
        }),
      ).eql(true);
    });
  });
});
