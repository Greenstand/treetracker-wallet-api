const { expect } = require('chai');
const JWTService = require('./JWTService');

describe('JWTService', () => {
  it('signed payload should be able to be verified', () => {
    const payload = { id: 1 };
    const token = JWTService.sign(payload);
    expect(token).match(/\S+/);
    const result = JWTService.verify(`Bearer ${token}`);
    expect(result).property('id').eq(1);
  });

  describe('action tokens', () => {
    const payload = { sub: 'samwel@example.com', sender_wallet_id: 'w1' };

    it('signs an action token that verifies with issuer and action claim', () => {
      const token = JWTService.signActionToken(payload);
      expect(token).match(/\S+/);
      const result = JWTService.verifyActionToken(token);
      expect(result).property('action').eq('send-token');
      expect(result).property('iss').eq('greenstand');
      expect(result).property('sub').eq('samwel@example.com');
      expect(result).property('exp').to.be.a('number');
    });

    it('rejects an expired action token with 401', () => {
      const token = JWTService.signActionToken(payload, { expiresIn: '-1s' });
      expect(() => JWTService.verifyActionToken(token))
        .to.throw()
        .that.has.property('code', 401);
    });

    it('rejects a tampered/invalid signature with 401', () => {
      const token = `${JWTService.signActionToken(payload)}tampered`;
      expect(() => JWTService.verifyActionToken(token))
        .to.throw()
        .that.has.property('code', 401);
    });

    it('rejects a login token (missing action claim) with 401', () => {
      const loginToken = JWTService.sign({ id: 1 });
      expect(() => JWTService.verifyActionToken(loginToken))
        .to.throw()
        .that.has.property('code', 401);
    });

    it('rejects a missing token with 401', () => {
      expect(() => JWTService.verifyActionToken())
        .to.throw()
        .that.has.property('code', 401);
    });
  });
});
