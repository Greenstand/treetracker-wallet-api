const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const JWTTools = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const JWTService = require('./JWTService');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('JWTService', () => {
  describe('verify', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('should error out if authorization is empty', async () => {
      await expect(JWTService.verify()).to.be.rejectedWith(
        'ERROR: Authentication, no token supplied for protected path',
      );
    });

    it('invalid bearer token', async () => {
      await expect(
        JWTService.verify('this is the token'),
      ).to.be.rejectedWith(
        'ERROR: Authentication, invalid token received',
      );
    });

    it('token not verified successfully', async () => {
      sinon
        .stub(jwksClient.JwksClient.prototype, 'getSigningKey')
        .resolves({ getPublicKey: () => 'fake-public-key' });
      sinon
        .stub(JWTTools, 'verify')
        .callsFake((token, publicKey, options, callback) => {
          callback(new Error('invalid signature'), undefined);
        });

      await expect(
        JWTService.verify('Bearer invalid_token'),
      ).to.be.rejectedWith(
        'ERROR: Authentication, token not verified',
      );
    });

    it('token verified but has no sub', async () => {
      sinon
        .stub(jwksClient.JwksClient.prototype, 'getSigningKey')
        .resolves({ getPublicKey: () => 'fake-public-key' });
      sinon
        .stub(JWTTools, 'verify')
        .callsFake((token, publicKey, options, callback) => {
          callback(undefined, { id: 'userId' });
        });

      await expect(
        JWTService.verify('Bearer no_sub_token'),
      ).to.be.rejectedWith(
        'ERROR: Authentication, invalid token received',
      );
    });

    it('token verified successfully', async () => {
      sinon
        .stub(jwksClient.JwksClient.prototype, 'getSigningKey')
        .resolves({ getPublicKey: () => 'fake-public-key' });
      sinon
        .stub(JWTTools, 'verify')
        .callsFake((token, publicKey, options, callback) => {
          callback(undefined, { sub: 'userId' });
        });

      const result = await JWTService.verify('Bearer valid_token');
      expect(result).to.eql({ id: 'userId' });
    });
  });
});
