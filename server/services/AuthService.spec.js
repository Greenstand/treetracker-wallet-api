const { expect } = require('chai');
const Sinon = require('sinon');
const AuthService = require('./AuthService');
const HashService = require('./HashService');
const JWTService = require('./JWTService');
const WalletService = require('./WalletService');
const Event = require('../models/Event');

describe('AuthService', () => {
  it('signin', async () => {
    const walletObject = { salt: 'salt', password: 'hash', id: 'id' };
    const getByIdOrNameStub = Sinon.stub(
      WalletService.prototype,
      'getByIdOrName',
    ).resolves(walletObject);

    const logEventStub = Sinon.stub(Event.prototype, 'logEvent');
    const sha512Stub = Sinon.stub(HashService, 'sha512').returns('hash');
    const jwtSignStub = Sinon.stub(JWTService, 'sign').resolves('token');
    const details = { wallet: 'wallet', password: 'password' };
    const token = await AuthService.signIn(details);
    expect(getByIdOrNameStub.calledOnceWithExactly(details.wallet)).eql(true);
    expect(sha512Stub.calledOnceWithExactly(details.password, 'salt')).eql(
      true,
    );
    expect(jwtSignStub.calledOnceWithExactly(walletObject)).eql(true);
    expect(token).eql('token');
    expect(
      logEventStub.calledOnceWithExactly({
        wallet_id: 'id',
        type: 'login',
        payload: {},
      }),
    ).to.eql(true);
    getByIdOrNameStub.restore();
    sha512Stub.restore();
    jwtSignStub.restore();
    logEventStub.restore();
  });

  it('failed signin', async () => {
    const walletObject = { salt: 'salt', password: 'password' };
    const getByIdOrNameStub = Sinon.stub(
      WalletService.prototype,
      'getByIdOrName',
    ).resolves(walletObject);
    const logEventStub = Sinon.stub(Event.prototype, 'logEvent');
    const sha512Stub = Sinon.stub(HashService, 'sha512').returns('hash');
    const jwtSignStub = Sinon.stub(JWTService, 'sign').resolves('token');
    const details = { wallet: 'wallet', password: 'password' };
    const token = await AuthService.signIn(details);
    expect(getByIdOrNameStub.calledOnceWithExactly(details.wallet)).eql(true);
    expect(sha512Stub.calledOnceWithExactly(details.password, 'salt')).eql(
      true,
    );
    expect(jwtSignStub.notCalled).eql(true);
    expect(token).eql(false);
    expect(logEventStub.notCalled).to.eql(true);
    getByIdOrNameStub.restore();
    sha512Stub.restore();
    jwtSignStub.restore();
    logEventStub.restore();
  });
});
