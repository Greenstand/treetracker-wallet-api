const sinon = require('sinon');
const { expect } = require('chai');
const express = require('express');
const request = require('supertest');
const authRouter = require('../routes/authRouter');
const JWTService = require('../services/JWTService');
const { errorHandler } = require('../utils/utils');
const AuthService = require('../services/AuthService');

describe('authHandler', () => {
  let app;

  before(() => {
    sinon.stub(JWTService, 'sign');
    app = express();
    app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(express.json()); // parse application/json
    app.use(authRouter);
    app.use(errorHandler);
  });

  after(() => {
    sinon.restore();
  });

  describe('authPost', () => {
    let signInStub;

    beforeEach(() => {
      signInStub = sinon.stub(AuthService, 'signIn');
    });

    afterEach(() => {
      signInStub.restore();
    });

    it('missing wallet should throw error', async () => {
      const res = await request(app).post('/auth').send({
        password: 'xxx',
      });
      expect(res).property('statusCode').eq(422);
      expect(res.body.code).eq(422);
      expect(res.body.message).match(/wallet.*required/);
      expect(signInStub.notCalled).eql(true);
    });

    it('missing password should throw error', async () => {
      const res = await request(app).post('/auth').send({
        wallet: 'xxxx',
      });
      expect(res).property('statusCode').eq(422);
      expect(res.body.code).eq(422);
      expect(res.body.message).match(/password.*required/);
      expect(signInStub.notCalled).eql(true);
    });

    it('password too long should throw error', async () => {
      const res = await request(app).post('/auth').send({
        wallet: 'test',
        password:
          '123456789012345678901234567890123456789012345678901234567890',
      });
      expect(res).property('statusCode').eq(422);
      expect(res.body.message).match(/password.*less.*32/);
      expect(signInStub.notCalled).eql(true);
    });

    it('should throw error --invalid credentials', async () => {
      signInStub.resolves();
      const res = await request(app).post('/auth').send({
        wallet: 'test',
        password: '1234567890123456789',
      });
      expect(res).property('statusCode').eq(401);
      expect(res.body.message).eql('Invalid Credentials');
    });

    it('should signin successfully', async () => {
      signInStub.resolves('jwt token');
      const res = await request(app).post('/auth').send({
        wallet: 'test',
        password: '1234567890123456789',
      });
      expect(res).property('statusCode').eq(200);
      expect(res.body.token).eql('jwt token');
    });
  });
});
