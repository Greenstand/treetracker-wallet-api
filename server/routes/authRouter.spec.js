const request = require('supertest');
const express = require('express');
const { expect } = require('chai');
const sinon = require('sinon');
const authRouter = require('./authRouter');
const { errorHandler, apiKeyHandler } = require('../utils/utils');
const ApiKeyService = require('../services/ApiKeyService');
const WalletService = require('../services/WalletService');
const JWTService = require('../services/JWTService');

describe('authRouter', () => {
  let app;

  before(() => {
    sinon.stub(ApiKeyService.prototype, 'check');
    sinon.stub(JWTService.prototype, 'sign');
    sinon.stub(WalletService.prototype, 'getByName').resolves({
      authorize: () => ({ id: 1 }),
    });
    app = express();
    app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(express.json()); // parse application/json
    app.use(apiKeyHandler, authRouter);
    app.use(errorHandler);
  });

  after(() => {
    sinon.restore();
  });

  it('missing wallet should throw error', async () => {
    const res = await request(app).post('/auth').send({
      password: 'xxx',
    });
    expect(res).property('statusCode').eq(422);
    expect(res.body.code).eq(422);
    expect(res.body.message).match(/wallet.*required/);
  });

  it('password too long should throw error', async () => {
    const res = await request(app).post('/auth').send({
      wallet: 'test',
      password: '123456789012345678901234567890123456789012345678901234567890',
    });
    expect(res).property('statusCode').eq(422);
    expect(res.body.message).match(/less/);
  });
});
