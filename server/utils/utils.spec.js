const request = require('supertest');
const express = require('express');
const { expect } = require('chai');
const sinon = require('sinon');
const uuid = require('uuid');
const helper = require('./utils');
const HttpError = require('./HttpError');
const JWTService = require('../services/JWTService');
const WalletService = require('../services/WalletService');

describe('routers/utils', () => {
  describe('handlerWrapper', () => {
    it('promise reject from current handler, should be catch and response to client', async () => {
      const app = express();
      app.get(
        '/test',
        helper.handlerWrapper(async (_res, rep) => {
          await new Promise((_resolve, reject) => {
            setTimeout(() => reject(new HttpError(400)), 0);
          });
          rep.status(200).send({});
        }),
      );
      app.use(helper.errorHandler);

      const res = await request(app).get('/test');
      expect(res.statusCode).eq(400);
    });

    it('promise reject from internal function, should be catch and response to client', async () => {
      async function internalInternalFunction() {
        await new Promise((_resolve, reject) => {
          setTimeout(() => reject(new HttpError(400)), 0);
        });
      }
      async function internalFunction() {
        await internalInternalFunction();
      }
      const app = express();
      app.get(
        '/test',
        helper.handlerWrapper(async (_res, rep) => {
          await internalFunction();
          rep.status(200).send({});
        }),
      );
      app.use(helper.errorHandler);

      const res = await request(app).get('/test');
      expect(res.statusCode).eq(400);
    });

    it('internal async function throw error, should be catch and response to client', async () => {
      async function internalInternalFunction() {
        throw new HttpError(400);
      }
      async function internalFunction() {
        await internalInternalFunction();
      }
      const app = express();
      app.get(
        '/test',
        helper.handlerWrapper(async (_res, rep) => {
          await internalFunction();
          rep.status(200).send({});
        }),
      );
      app.use(helper.errorHandler);

      const res = await request(app).get('/test');
      expect(res.statusCode).eq(400);
    });

    it('internal SYNC function throw error, should be catch and response to client', async () => {
      function internalInternalFunction() {
        throw new HttpError(400);
      }
      async function internalFunction() {
        internalInternalFunction();
      }
      const app = express();
      app.get(
        '/test',
        helper.handlerWrapper(async (_res, rep) => {
          await internalFunction();
          rep.status(200).send({});
        }),
      );
      app.use(helper.errorHandler);

      const res = await request(app).get('/test');
      expect(res.statusCode).eq(400);
    });
  });

  describe('verifyJWTHandler', () => {
    it('pass correct token should pass the verify', async () => {
      const keycloakId = uuid.v4();
      const walletId = uuid.v4();
      const verifyStub = sinon.stub(JWTService, 'verify').returns({
        id: keycloakId,
      });
      const getWalletIdByKeycloakId = sinon
        .stub(WalletService.prototype, 'getWalletIdByKeycloakId')
        .resolves({ id: walletId });
      const app = express();
      app.get('/test', helper.verifyJWTHandler, async (req, res) => {
        res.send({ id: req.wallet_id });
      });
      app.use(helper.errorHandler);

      const res = await request(app)
        .get('/test')
        .set('Authorization', `Bearer token`);

      expect(res.statusCode).eq(200);
      expect(res.body.id).eql(walletId);
      expect(getWalletIdByKeycloakId.calledOnceWithExactly(keycloakId)).eql(
        true,
      );
      expect(verifyStub.calledOnceWithExactly('Bearer token')).eql(true);
      sinon.restore();
    });

    it('to create parent wallet', async () => {
      const keycloakId = uuid.v4();
      const verifyStub = sinon.stub(JWTService, 'verify').returns({
        id: keycloakId,
      });
      const getWalletIdByKeycloakId = sinon
        .stub(WalletService.prototype, 'getWalletIdByKeycloakId')
        .resolves();
      const app = express();
      // mock
      app.post('/wallets', [
        helper.verifyJWTHandler,
        async (req, res) =>
          res.status(200).send({ keycloakId: req.keycloak_id }),
      ]);
      app.use(helper.errorHandler);

      const res = await request(app)
        .post('/wallets')
        .set('Authorization', `Bearer token`);
      expect(res.statusCode).eq(200);
      expect(res.body).eql({
        keycloakId,
      });
      expect(getWalletIdByKeycloakId.calledOnceWithExactly(keycloakId)).eql(
        true,
      );
      expect(verifyStub.calledOnceWithExactly('Bearer token')).eql(true);
      sinon.restore();
    });

    // The token verifies here; only the wallet is missing. Named for what it
    // stubs, not for a corrupt token.
    it('a valid token with no wallet yet gets 409 and reason no_wallet', async () => {
      const keycloakId = uuid.v4();
      const verifyStub = sinon.stub(JWTService, 'verify').returns({
        id: keycloakId,
      });
      const getWalletIdByKeycloakId = sinon
        .stub(WalletService.prototype, 'getWalletIdByKeycloakId')
        .resolves();
      const app = express();
      // mock
      app.get('/wallets', [
        helper.verifyJWTHandler,
        async (req, res) => res.status(200).send({ id: req.wallet_id }),
      ]);
      app.use(helper.errorHandler);

      const res = await request(app)
        .get('/wallets')
        .set('Authorization', `Bearer token`);
      expect(res.statusCode).eq(409);
      expect(res.body).eql({
        code: 409,
        message: 'ERROR: This account has no wallet yet',
        reason: 'no_wallet',
      });
      expect(getWalletIdByKeycloakId.calledOnceWithExactly(keycloakId)).eql(
        true,
      );
      expect(verifyStub.calledOnceWithExactly('Bearer token')).eql(true);
      sinon.restore();
    });
  });
});
