const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const { v4: uuid } = require('uuid');
const Wallet = require('./Wallet');

chai.use(sinonChai);
const { expect } = chai;
const WalletRepository = require('../repositories/WalletRepository');
const TrustRepository = require('../repositories/TrustRepository');
const HttpError = require('../utils/HttpError');
const Session = require('../infra/database/Session');
const TrustRelationshipEnums = require('../utils/trust-enums');
const TokenRepository = require('../repositories/TokenRepository');

describe('Wallet Model', () => {
  let walletModel;
  let walletRepositoryStub;
  let trustRepositoryStub;

  beforeEach(() => {
    const session = new Session();
    walletModel = new Wallet(session);

    walletRepositoryStub = sinon.stub(WalletRepository.prototype);
    trustRepositoryStub = sinon.stub(TrustRepository.prototype);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createWallet function', async () => {
    const walletId = uuid();
    const wallet = 'wallet';

    it('should error out, wallet already exists', async () => {
      walletRepositoryStub.getByName.resolves();
      let error;

      try {
        await walletModel.createWallet(walletId, wallet);
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(403);
      expect(error.message).eql(`The wallet 'wallet' already exists`);
      expect(walletRepositoryStub.getByName).calledOnceWithExactly('wallet');
      expect(trustRepositoryStub.create).not.called;
      expect(walletRepositoryStub.create).not.called;
    });

    it('should error out, some other error', async () => {
      walletRepositoryStub.getByName.rejects('internal error');
      let error;

      try {
        await walletModel.createWallet(walletId, wallet);
      } catch (e) {
        error = e;
      }

      expect(error.toString()).eql(`internal error`);
      expect(walletRepositoryStub.getByName).calledOnceWithExactly('wallet');
      expect(trustRepositoryStub.create).not.called;
      expect(walletRepositoryStub.create).not.called;
    });

    it('should create wallet', async () => {
      walletRepositoryStub.getByName.rejects(new HttpError(404));
      const newWalletId = uuid();

      walletRepositoryStub.create.resolves({ id: newWalletId });

      const result = await walletModel.createWallet(walletId, wallet);

      expect(result).eql({ id: newWalletId });
      expect(trustRepositoryStub.create).calledOnceWithExactly({
        actor_wallet_id: walletId,
        originator_wallet_id: walletId,
        target_wallet_id: newWalletId,
        request_type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
        type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
        state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
      });
      expect(walletRepositoryStub.getByName).calledOnceWithExactly('wallet');
      expect(walletRepositoryStub.create).calledOnceWithExactly({
        name: wallet,
      });
    });
  });

  it('getById function', async () => {
    const walletId = uuid();
    walletRepositoryStub.getById.resolves({ id: walletId, wallet: 'wallet' });
    const result = await walletModel.getById(walletId);

    expect(result).eql({ id: walletId, wallet: 'wallet' });
    expect(walletRepositoryStub.getById).calledOnceWithExactly(walletId);
  });

  it('getWallet function', async () => {
    const walletId = uuid();
    walletRepositoryStub.getById.resolves({ id: walletId, name: 'wallet' });
    const tokenRepositoryStub = sinon
      .stub(TokenRepository.prototype, 'countByFilter')
      .resolves(20);
    const result = await walletModel.getWallet(walletId);

    expect(result).eql({
      id: walletId,
      wallet: 'wallet',
      tokens_in_wallet: 20,
    });
    expect(walletRepositoryStub.getById).calledOnceWithExactly(walletId);
    expect(tokenRepositoryStub).calledOnceWithExactly({ wallet_id: walletId });
  });

  it('getByName function', async () => {
    const walletId = uuid();
    const wallet = 'wallet';
    walletRepositoryStub.getByName.resolves({ id: walletId, wallet });
    const result = await walletModel.getByName(wallet);

    expect(result).eql({ id: walletId, wallet });
    expect(walletRepositoryStub.getByName).calledOnceWithExactly('wallet');
  });

  it('getAllWallets function', async () => {
    const walletId = uuid();
    const wallet = 'wallet';
    walletRepositoryStub.getAllWallets.resolves({
      wallets: [{ id: walletId, wallet }],
    });
    const result = await walletModel.getAllWallets(
      walletId,
      { limit: 1, offset: 1 },
      wallet,
      false,
    );

    expect(result).eql({
      wallets: [{ id: walletId, wallet }],
    });
    expect(walletRepositoryStub.getAllWallets).calledOnceWithExactly(
      walletId,
      { limit: 1, offset: 1 },
      wallet,
      false,
    );
  });

  describe('hasControlOver function', async () => {
    const wallet1uuid = uuid();
    const wallet2uuid = uuid();
    let subWalletStub;

    beforeEach(() => {
      subWalletStub = sinon.stub(Wallet.prototype, 'getSubWallets');
    });

    it('should return true -- my wallet', async () => {
      const result = await walletModel.hasControlOver(wallet1uuid, wallet1uuid);
      expect(result).eql(true);
      expect(subWalletStub).not.called;
    });

    it('should return true -- subwallet', async () => {
      subWalletStub.resolves([1]);
      const result = await walletModel.hasControlOver(wallet1uuid, wallet2uuid);
      expect(result).eql(true);
      expect(subWalletStub).calledOnceWithExactly(wallet1uuid, wallet2uuid);
    });

    it('should return false', async () => {
      subWalletStub.resolves([]);
      const result = await walletModel.hasControlOver(wallet1uuid, wallet2uuid);
      expect(result).eql(false);
      expect(subWalletStub).calledOnceWithExactly(wallet1uuid, wallet2uuid);
    });
  });

  describe('getSubWallets function', async () => {
    const wallet1uuid = uuid();
    const wallet2uuid = uuid();
    it('getSubWallets without specific childId', async () => {
      trustRepositoryStub.getByFilter.resolves(['wallet1']);
      const result = await walletModel.getSubWallets(wallet1uuid);
      expect(result).eql(['wallet1']);
      expect(trustRepositoryStub.getByFilter).calledOnceWithExactly({
        or: [
          {
            and: [
              { actor_wallet_id: wallet1uuid },
              {
                request_type:
                  TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
              },

              { state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted },
            ],
          },
          {
            and: [
              {
                request_type:
                  TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
              },
              { target_wallet_id: wallet1uuid },
              { state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted },
            ],
          },
        ],
      });
    });

    it('getSubWallets with specific childId', async () => {
      trustRepositoryStub.getByFilter.resolves(['wallet2']);
      const result = await walletModel.getSubWallets(wallet1uuid, wallet2uuid);
      expect(result).eql(['wallet2']);
      expect(trustRepositoryStub.getByFilter).calledOnceWithExactly({
        or: [
          {
            and: [
              { actor_wallet_id: wallet1uuid },
              {
                request_type:
                  TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
              },

              { state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted },
              { target_wallet_id: wallet2uuid },
            ],
          },
          {
            and: [
              {
                request_type:
                  TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
              },
              { target_wallet_id: wallet1uuid },
              { state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted },
              { actor_wallet_id: wallet2uuid },
            ],
          },
        ],
      });
    });
  });
});
