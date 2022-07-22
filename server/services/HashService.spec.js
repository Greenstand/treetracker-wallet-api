const { expect } = require('chai');
const Sinon = require('sinon');
const Crypto = require('crypto');
const HashService = require('./HashService');

describe('HashService', () => {
  it('sha512', async () => {
    const hashUpdateStub = Sinon.stub();
    const hashDigestStub = Sinon.stub().returns('hash');
    const cryptoStub = Sinon.stub(Crypto, 'createHmac').returns({
      update: hashUpdateStub,
      digest: hashDigestStub,
    });
    const hash = HashService.sha512('password', 'salt');
    expect(cryptoStub.calledOnceWithExactly('sha512', 'salt')).eql(true);
    expect(hashUpdateStub.calledOnceWithExactly('password')).eql(true);
    expect(hashDigestStub.calledOnceWithExactly('hex')).eql(true);
    expect(hash).eql('hash');
    cryptoStub.restore();
  });
});
