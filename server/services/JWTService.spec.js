const sinon = require('sinon');
const { expect } = require('chai');
const JWTTools = require('jsonwebtoken');
const JWTService = require('./JWTService');

describe('JWTService', () => {
  describe('verify', () => {
    afterEach(() => {
      sinon.restore();
    });
    it('should error out if authorization is empty', () => {
      expect(() => JWTService.verify()).to.throw(
        'ERROR: Authentication, no token supplied for protected path',
      );
    });

    it('invalid bearer token', () => {
      expect(() => JWTService.verify('this is the token')).to.throw(
        'ERROR: Authentication, invalid token received',
      );
    });

    it('token not verified successfully', () => {
      expect(() => JWTService.verify('Bearer invalid_token')).to.throw(
        'ERROR: Authentication, token not verified',
      );
    });

    it('token verified but has no sub', () => {
      sinon
        .stub(JWTTools, 'verify')
        .callsFake((token, publicKey, options, callback) => {
          callback(undefined, { id: 'userId' });
        });

      expect(() => JWTService.verify('Bearer no_sub_token')).to.throw(
        'ERROR: Authentication, invalid token received',
      );
    });

    it('token verified successfully', () => {
      sinon
        .stub(JWTTools, 'verify')
        .callsFake((token, publicKey, options, callback) => {
          callback(undefined, { sub: 'userId' });
        });

      const result = JWTService.verify('Bearer no_sub_token');
      expect(result).eql({ id: 'userId' });
    });
  });
});
