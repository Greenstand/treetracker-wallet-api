const request = require('supertest');
const express = require('express');
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const uuid = require('uuid');
const transferRouter = require('../routes/transferRouter');
const { errorHandler } = require('../utils/utils');

chai.use(sinonChai);
const { expect } = chai;

const JWTService = require('../services/JWTService');
const TransferService = require('../services/TransferService');
const TransferEnums = require('../utils/transfer-enum');
const WalletService = require('../services/WalletService');

describe('transferRouter', () => {
  let app;

  const authenticatedWalletId = uuid.v4();
  const keycloakId = uuid.v4();

  beforeEach(() => {
    sinon.stub(JWTService, 'verify').returns({
      id: keycloakId,
    });
    sinon.stub(WalletService.prototype, 'getWalletIdByKeycloakId').resolves({
      id: authenticatedWalletId,
    });
    app = express();
    app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(express.json()); // parse application/json
    app.use(transferRouter);
    app.use(errorHandler);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('get /transfers successfully', async () => {
    const token0Id = uuid.v4();

    const getByFilterStub = sinon
      .stub(TransferService.prototype, 'getByFilter')
      .resolves({
        transfers: [{ id: token0Id, state: TransferEnums.STATE.completed }],
      });

    const res = await request(app).get(
      '/transfers?limit=3&wallet=testWallet&offset=5',
    );

    expect(res.body.transfers).lengthOf(1);
    expect(res.body.transfers[0].id).eql(token0Id);
    expect(res.body.transfers[0].state).eql(TransferEnums.STATE.completed);
    expect(
      getByFilterStub.calledOnceWithExactly({
        limit: '3',
        wallet: 'testWallet',
        offset: '5',
      }),
    );
  });

  it('missing tokens should throw error', async () => {
    const res = await request(app).post('/transfers').send({
      sender_wallet: 'ssss',
      receiver_wallet: 'ssss',
    });
    expect(res).property('statusCode').eq(422);
    expect(res.body.message).match(/bundle.*required/);
  });

  it('missing sender wallet should throw error', async () => {
    const tokenId = uuid.v4();
    const res = await request(app)
      .post('/transfers')
      .send({
        tokens: [tokenId],
        receiver_wallet: 'ssss',
      });
    expect(res).property('statusCode').eq(422);
    expect(res.body.message).match(/sender_wallet.*required/);
  });

  it('missing reeiver wallet should throw error', async () => {
    const tokenId = uuid.v4();
    const res = await request(app)
      .post('/transfers')
      .send({
        tokens: [tokenId],
        sender_wallet: 'ssss',
      });
    expect(res).property('statusCode').eq(422);
    expect(res.body.message).match(/receiver_wallet.*required/);
  });

  it('Duplicated token uuid should throw error', async () => {
    const walletId = uuid.v4();
    const wallet2Id = uuid.v4();
    const tokenId = uuid.v4();
    const res = await request(app)
      .post('/transfers')
      .send({
        tokens: [tokenId, tokenId],
        receiver_wallet: walletId,
        sender_wallet: wallet2Id,
      });
    expect(res).property('statusCode').eq(422);
    expect(res.body.message).match(/duplicate/i);
  });

  it('transfer using sender and receiver wallet, should return successfully', async () => {
    const tokenId = uuid.v4();
    const initiateTranferStub = sinon
      .stub(TransferService.prototype, 'initiateTransfer')
      .resolves({
        result: {
          id: tokenId,
          state: TransferEnums.STATE.completed,
          parameters: {
            bundle: {
              bundleSize: 1,
            },
          },
        },
        status: 201,
      });
    const res = await request(app)
      .post('/transfers')
      .send({
        tokens: ['c5d2c7f6-4aab-40a6-ba0a-af8a3f10d320'],
        sender_wallet: 'wallet1',
        receiver_wallet: 'wallet2',
      });
    expect(res).property('statusCode').eq(201);
    expect(res.body).eql({
      id: tokenId,
      state: TransferEnums.STATE.completed,
      parameters: {
        bundle: {
          bundleSize: 1,
        },
      },
      token_count: 1,
    });
    expect(
      initiateTranferStub.calledOnceWithExactly(
        {
          tokens: ['c5d2c7f6-4aab-40a6-ba0a-af8a3f10d320'],
          sender_wallet: 'wallet1',
          receiver_wallet: 'wallet2',
          claim: false,
        },
        authenticatedWalletId,
      ),
    ).eql(true);
  });

  it('bundle case should be successful', async () => {
    const walletId = uuid.v4();
    const wallet2Id = uuid.v4();
    const tokenId = uuid.v4();
    const initiateTranferStub = sinon
      .stub(TransferService.prototype, 'initiateTransfer')
      .resolves({
        result: {
          id: tokenId,
          state: TransferEnums.STATE.completed,
          parameters: {
            bundle: {
              bundleSize: 1,
            },
          },
        },
        status: 202,
      });
    const res = await request(app)
      .post('/transfers')
      .send({
        bundle: {
          bundle_size: 1,
        },
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
        claim: false,
      });
    expect(res).property('statusCode').eq(202);
    expect(res.body).eql({
      id: tokenId,
      state: TransferEnums.STATE.completed,
      parameters: {
        bundle: {
          bundleSize: 1,
        },
      },
      token_count: 1,
    });
    expect(
      initiateTranferStub.calledOnceWithExactly(
        {
          bundle: {
            bundle_size: 1,
          },
          sender_wallet: walletId,
          receiver_wallet: wallet2Id,
          claim: false,
        },
        authenticatedWalletId,
      ),
    ).eql(true);
  });

  it('bundle case, -1 should throw error', async () => {
    const walletId = uuid.v4();
    const wallet2Id = uuid.v4();
    const res = await request(app)
      .post('/transfers')
      .send({
        bundle: {
          bundle_size: -1,
        },
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
      });
    expect(res).property('statusCode').eq(422);
    expect(res.body.message).match(/bundle_size.*greater/);
  });

  it('bundle case, 1.1 should throw error', async () => {
    const walletId = uuid.v4();
    const wallet2Id = uuid.v4();
    const res = await request(app)
      .post('/transfers')
      .send({
        bundle: {
          bundle_size: 1.1,
        },
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
      });
    expect(res).property('statusCode').eq(422);
    expect(res.body.message).match(/bundle_size.*integer/);
  });

  it('bundle case, 10001 should throw error', async () => {
    const walletId = uuid.v4();
    const wallet2Id = uuid.v4();
    const res = await request(app)
      .post('/transfers')
      .send({
        bundle: {
          bundle_size: 10001,
        },
        sender_wallet: walletId,
        receiver_wallet: wallet2Id,
      });
    expect(res).property('statusCode').eq(422);
    expect(res.body.message).match(/bundle_size.*less/);
  });

  describe('/decline', () => {
    const transferId = uuid.v4();

    it('transferId param should be a guid, should throw error', async () => {
      const res = await request(app).post(`/transfers/transferId/decline`);
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/transfer_id.*guid/i);
    });

    it('should decline transfer successfully', async () => {
      const declineTransferStub = sinon
        .stub(TransferService.prototype, 'declineTransfer')
        .resolves({ transferId });
      const res = await request(app).post(`/transfers/${transferId}/decline`);
      expect(res).property('statusCode').eq(200);
      expect(res.body).eql({ transferId });
      expect(
        declineTransferStub.calledOnceWithExactly(
          transferId,
          authenticatedWalletId,
        ),
      ).eql(true);
    });
  });

  describe('/accept', () => {
    const transferId = uuid.v4();

    it('transferId param should be a guid, should throw error', async () => {
      const res = await request(app).post(`/transfers/transferId/accept`);
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/transfer_id.*guid/i);
    });

    it('should accept transfer successfully', async () => {
      const acceptTransferStub = sinon
        .stub(TransferService.prototype, 'acceptTransfer')
        .resolves({ transferId });
      const res = await request(app).post(`/transfers/${transferId}/accept`);
      expect(res).property('statusCode').eq(200);
      expect(res.body).eql({ transferId });
      expect(
        acceptTransferStub.calledOnceWithExactly(
          transferId,
          authenticatedWalletId,
        ),
      ).eql(true);
    });
  });

  describe('/delete', () => {
    const transferId = uuid.v4();

    it('transferId param should be a guid, should throw error', async () => {
      const res = await request(app).delete(`/transfers/transferId`);
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/transfer_id.*guid/i);
    });

    it('should cancel transfer successfully', async () => {
      const cancelTransferStub = sinon
        .stub(TransferService.prototype, 'cancelTransfer')
        .resolves({ transferId });
      const res = await request(app).delete(`/transfers/${transferId}`);
      expect(res).property('statusCode').eq(200);
      expect(res.body).eql({ transferId });
      expect(
        cancelTransferStub.calledOnceWithExactly(
          transferId,
          authenticatedWalletId,
        ),
      ).eql(true);
    });
  });

  describe('/fulfill', () => {
    const transferId = uuid.v4();
    const tokenId = uuid.v4();

    it('transferId param should be a guid, should throw error', async () => {
      const res = await request(app).post(`/transfers/transferId/fulfill`);
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/transfer_id.*guid/i);
    });

    it('Nether tokens nor implicit is specified, should throw error', async () => {
      const res = await request(app)
        .post(`/transfers/${transferId}/fulfill`)
        .send({});
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/implicit.*required/i);
    });

    it('Duplicated token uuid should throw error', async () => {
      const res = await request(app)
        .post(`/transfers/${transferId}/fulfill`)
        .send({
          tokens: [tokenId, tokenId],
        });
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/duplicate/i);
    });

    it('should fulfill transfer successfully', async () => {
      const fulfillTransferStub = sinon
        .stub(TransferService.prototype, 'fulfillTransfer')
        .resolves({ tokenId });
      const res = await request(app)
        .post(`/transfers/${transferId}/fulfill`)
        .send({
          tokens: [tokenId],
        });
      expect(res).property('statusCode').eq(200);
      expect(res.body).eql({ tokenId });
      expect(
        fulfillTransferStub.calledOnceWithExactly(
          authenticatedWalletId,
          transferId,
          { tokens: [tokenId] },
        ),
      ).eql(true);
    });
  });

  describe('GET /{transfer_id}', () => {
    it('transferId param should be a guid, should throw error', async () => {
      const res = await request(app).get(`/transfers/transferId`);
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/transfer_id.*guid/i);
    });

    it('Successfully', async () => {
      const transferId = uuid.v4();
      const transfer = { id: transferId };
      const getTransferByIdStub = sinon
        .stub(TransferService.prototype, 'getTransferById')
        .resolves(transfer);
      const res = await request(app).get(`/transfers/${transferId}`);
      expect(
        getTransferByIdStub.calledOnceWithExactly(
          transferId,
          authenticatedWalletId,
        ),
      ).eql(true);
      expect(res).property('statusCode').eq(200);
      expect(res.body).property('id').eq(transferId);
    });
  });

  describe('GET /{transfer_id}/tokens offset and limit working', () => {
    const transferId = uuid.v4();
    const tokenId = uuid.v4();
    const token2Id = uuid.v4();

    it('transferId param should be a guid, should throw error', async () => {
      const res = await request(app).get(
        `/transfers/transferId/tokens?limit=20`,
      );
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/transfer_id.*guid/i);
    });

    it('Successfully', async () => {
      const getTokensByTransferIdStub = sinon
        .stub(TransferService.prototype, 'getTokensByTransferId')
        .resolves([tokenId, token2Id]);
      const res = await request(app).get(
        `/transfers/${transferId}/tokens?limit=1`,
      );
      expect(res).property('statusCode').eq(200);
      expect(res.body).property('tokens').lengthOf(2);
      expect(res.body).property('tokens').eql([tokenId, token2Id]);
      expect(
        getTokensByTransferIdStub.calledOnceWithExactly(
          transferId,
          authenticatedWalletId,
          1,
          0,
        ),
      ).eql(true);
    });
  });
});
