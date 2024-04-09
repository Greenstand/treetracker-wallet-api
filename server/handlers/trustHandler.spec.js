const request = require('supertest');
const express = require('express');
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const uuid = require('uuid');
const trustRouter = require('../routes/trustRouter');
const { errorHandler } = require('../utils/utils');

chai.use(sinonChai);
const { expect } = chai;
const ApiKeyService = require('../services/ApiKeyService');
const TrustService = require('../services/TrustService');
const JWTService = require('../services/JWTService');
const TrustRelationshipEnums = require('../utils/trust-enums');

describe('trustRouter', () => {
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
    app.use(trustRouter);
    app.use(errorHandler);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('post /trust_relationships', () => {
    const walletId = uuid.v4();

    it('missed parameters', async () => {
      const res = await request(app).post('/trust_relationships').send({});
      expect(res).property('statusCode').eq(422);
    });

    it('missed parameters -- requestee wallet is required', async () => {
      const res = await request(app).post('/trust_relationships').send({
        trust_request_type: 'send',
      });
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/requestee_wallet.*required/);
    });

    it('wrong parameters', async () => {
      const res = await request(app).post('/trust_relationships').send({
        trust_request_type: 'sendError',
        requestee_wallet: 'wallet',
      });
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/trust_request_type.*one/);
    });

    it('successfully', async () => {
      const trustRelationshipId = uuid.v4();
      const createTrustRelationshipStub = sinon
        .stub(TrustService.prototype, 'createTrustRelationship')
        .resolves({ id: trustRelationshipId });

      const res = await request(app).post('/trust_relationships').send({
        trust_request_type: 'send',
        requestee_wallet: walletId,
      });

      expect(res).property('statusCode').eq(201);
      expect(
        createTrustRelationshipStub.calledOnceWithExactly({
          walletLoginId: authenticatedWalletId,
          trustRequestType: 'send',
          requesteeWallet: walletId,
          requesterWallet: undefined,
        }),
      ).eql(true);
    });
  });

  describe('post /trust_relationships/:id/accept', () => {
    it('missed parameters -- relationshipId must be a guid', async () => {
      const res = await request(app).post(
        `/trust_relationships/trustRelationshipId/accept`,
      );
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/trustRelationshipId.*GUID/);
    });

    it('successfully', async () => {
      const trustRelationshipId = uuid.v4();
      const acceptTrustRequestStub = sinon
        .stub(TrustService.prototype, 'acceptTrustRequestSentToMe')
        .resolves({ id: trustRelationshipId });

      const res = await request(app).post(
        `/trust_relationships/${trustRelationshipId}/accept`,
      );

      expect(res).property('statusCode').eq(200);
      expect(
        acceptTrustRequestStub.calledOnceWithExactly({
          walletLoginId: authenticatedWalletId,
          trustRelationshipId,
        }),
      ).eql(true);
    });
  });

  describe('post /trust_relationships/:id/decline', () => {
    it('missed parameters -- relationshipId must be a guid', async () => {
      const res = await request(app).post(
        `/trust_relationships/trustRelationshipId/decline`,
      );
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/trustRelationshipId.*GUID/);
    });

    it('successfully', async () => {
      const trustRelationshipId = uuid.v4();
      const declineTrustRequestStub = sinon
        .stub(TrustService.prototype, 'declineTrustRequestSentToMe')
        .resolves({ id: trustRelationshipId });

      const res = await request(app).post(
        `/trust_relationships/${trustRelationshipId}/decline`,
      );

      expect(res).property('statusCode').eq(200);
      expect(
        declineTrustRequestStub.calledOnceWithExactly({
          walletLoginId: authenticatedWalletId,
          trustRelationshipId,
        }),
      ).eql(true);
    });
  });

  describe('delete /trust_relationships/:id', () => {
    it('missed parameters -- relationshipId must be a guid', async () => {
      const res = await request(app).delete(
        `/trust_relationships/trustRelationshipId`,
      );
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/trustRelationshipId.*GUID/);
    });

    it('successfully', async () => {
      const trustRelationshipId = uuid.v4();
      const declineTrustRequestStub = sinon
        .stub(TrustService.prototype, 'cancelTrustRequest')
        .resolves({ id: trustRelationshipId });

      const res = await request(app).delete(
        `/trust_relationships/${trustRelationshipId}`,
      );

      expect(res).property('statusCode').eq(200);
      expect(
        declineTrustRequestStub.calledOnceWithExactly({
          walletLoginId: authenticatedWalletId,
          trustRelationshipId,
        }),
      ).eql(true);
    });
  });

  describe('get /trust_relationships', () => {
    const trustId = uuid.v4();

    it('wrong state string should throw 422', async () => {
      const res = await request(app).get(`/trust_relationships?state=state`);
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/state.*one.*of/);
    });

    it('wrong type string should throw 422', async () => {
      const res = await request(app).get(`/trust_relationships?type=type`);
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/type.*one.*of/);
    });

    it('wrong request_type string should throw 422', async () => {
      const res = await request(app).get(
        `/trust_relationships?request_type=request_type`,
      );
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/request_type.*one.*of/);
    });

    it('successfully', async () => {
      const limit = 10;
      const offset = 0;
      const count = 1;
      const getAllTrustRelationshipsStub = sinon
        .stub(TrustService.prototype, 'getAllTrustRelationships')
        .resolves({
          result: [{ id: trustId }],
          count
        });
      const res = await request(app).get(
        `/trust_relationships?type=${TrustRelationshipEnums.ENTITY_TRUST_TYPE.send}&request_type=${TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send}&state=${TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted}&limit=${limit}&offset=${offset}`,
      );
      expect(res).property('statusCode').eq(200);
      expect(res.body.trust_relationships).lengthOf(1);
      expect(res.body.trust_relationships[0]).eql({ id: trustId });
      expect(getAllTrustRelationshipsStub).calledWith({
        state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
        type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
        request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
        limit,
        offset,
        walletId: authenticatedWalletId,
      });
    });
  });

  describe('get /trust_relationships/:id', () => {
    it('missed parameters -- relationshipId must be a guid', async () => {
      const res = await request(app).get(
          `/trust_relationships/trustRelationshipId`,
      );
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/trustRelationshipId.*GUID/);
    });

    it('successfully', async () => {
      const trustRelationshipId = uuid.v4();

      const trustRelationshipGetByIdStub = sinon
          .stub(TrustService.prototype, 'trustRelationshipGetById')
          .resolves({id: trustRelationshipId});

      const res = await request(app).get(
          `/trust_relationships/${trustRelationshipId}`,
      );

      expect(res).property('statusCode').eq(200);
      expect(
          trustRelationshipGetByIdStub.calledOnceWithExactly({
            walletLoginId: authenticatedWalletId,
            trustRelationshipId,
          }),
      ).eql(true);
    });

  })
});
