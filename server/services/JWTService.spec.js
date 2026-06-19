const sinon = require('sinon');
const { expect } = require('chai');
const JWTTools = require('jsonwebtoken');
const JWTService = require('./JWTService');

describe('JWTService', () => {
  describe('verify', () => {
    beforeEach(() => {
      process.env.KEYCLOAK_PUBLIC_KEY = 'test-public-key';
    });

    afterEach(() => {
      delete process.env.KEYCLOAK_PUBLIC_KEY;
      sinon.restore();
    });

    it('should error out if authorization is empty', async () => {
      try {
        await JWTService.verify();
        expect.fail('Expected JWTService.verify to throw');
      } catch (error) {
        expect(error.message).to.equal(
          'ERROR: Authentication, no token supplied for protected path',
        );
      }
    });

    it('invalid bearer token', async () => {
      try {
        await JWTService.verify('this is the token');
        expect.fail('Expected JWTService.verify to throw');
      } catch (error) {
        expect(error.message).to.equal(
          'ERROR: Authentication, invalid token received',
        );
      }
    });

    it('token not verified successfully', async () => {
      sinon
        .stub(JWTTools, 'verify')
        .callsFake((token, publicKey, options, callback) => {
          callback(new Error('invalid token'));
        });

      try {
        await JWTService.verify('Bearer invalid_token');
        expect.fail('Expected JWTService.verify to throw');
      } catch (error) {
        expect(error.message).to.equal(
          'ERROR: Authentication, token not verified',
        );
      }
    });

    it('token verified but has no sub', async () => {
      sinon
        .stub(JWTTools, 'verify')
        .callsFake((token, publicKey, options, callback) => {
          callback(undefined, { id: 'userId' });
        });

      try {
        await JWTService.verify('Bearer no_sub_token');
        expect.fail('Expected JWTService.verify to throw');
      } catch (error) {
        expect(error.message).to.equal(
          'ERROR: Authentication, invalid token received',
        );
      }
    });

    it('token verified successfully', async () => {
      sinon
        .stub(JWTTools, 'verify')
        .callsFake((token, publicKey, options, callback) => {
          callback(undefined, { sub: 'userId' });
        });

      const result = await JWTService.verify('Bearer no_sub_token');
      expect(result).eql({ id: 'userId' });
    });
  });
});
