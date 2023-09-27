const sinon = require('sinon');
const chai = require('chai');
const TrustService = require('./TrustService');
const WalletService = require('./WalletService');
const Wallet = require('../models/Wallet');
const Trust = require('../models/Trust');

const { expect } = chai;

describe('TrustService', () => {
  let trustService;

  beforeEach(() => {
    trustService = new TrustService();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('getTrustRelationships', async () => {
    const getTrustRelationshipsStub = sinon
      .stub(Trust.prototype, 'getTrustRelationships')
      .resolves(['trustRelationships']);

    const getWalletStub = sinon
        .stub(WalletService.prototype, 'getWallet')
        .resolves({id: 'walletId'})

    const trustRelationship = await trustService.getTrustRelationships({
      walletId: 'walletId',
      state: 'state',
      type: 'type',
      request_type: 'request_type',
      limit: 1,
      offset: 0
    });

    expect(trustRelationship).eql(['trustRelationships']);
    expect(getWalletStub.calledOnceWithExactly({
        walletId: 'walletId',
    }))
    expect(
      getTrustRelationshipsStub.calledOnceWithExactly({
        walletId: 'walletId',
        state: 'state',
        type: 'type',
        request_type: 'request_type',
        limit: 1,
        offset: 0,
      }),
    ).eql(true);
  });

  it('acceptTrustRequestSentToMe', async () => {
    const acceptTrustRelationshipStub = sinon
      .stub(Trust.prototype, 'acceptTrustRequestSentToMe')
      .resolves('trustRelationship');

    const trustRelationship = await trustService.acceptTrustRequestSentToMe({
      trustRelationshipId: 'trustRelationshipId',
      walletLoginId: 'walletLoginId',
    });
    expect(trustRelationship).eql('trustRelationship');
    expect(
      acceptTrustRelationshipStub.calledOnceWithExactly({
        trustRelationshipId: 'trustRelationshipId',
        walletId: 'walletLoginId',
      }),
    ).eql(true);
  });

  it('declineTrustRequestSentToMe', async () => {
    const declineTrustRelationshipStub = sinon
      .stub(Trust.prototype, 'declineTrustRequestSentToMe')
      .resolves('trustRelationship');

    const trustRelationship = await trustService.declineTrustRequestSentToMe({
      trustRelationshipId: 'trustRelationshipId',
      walletLoginId: 'walletLoginId',
    });
    expect(trustRelationship).eql('trustRelationship');
    expect(
      declineTrustRelationshipStub.calledOnceWithExactly({
        trustRelationshipId: 'trustRelationshipId',
        walletId: 'walletLoginId',
      }),
    ).eql(true);
  });

  it('cancelTrustRequest', async () => {
    const cancelTrustRelationshipStub = sinon
      .stub(Trust.prototype, 'cancelTrustRequest')
      .resolves('trustRelationship');

    const trustRelationship = await trustService.cancelTrustRequest({
      trustRelationshipId: 'trustRelationshipId',
      walletLoginId: 'walletLoginId',
    });
    expect(trustRelationship).eql('trustRelationship');
    expect(
      cancelTrustRelationshipStub.calledOnceWithExactly({
        trustRelationshipId: 'trustRelationshipId',
        walletId: 'walletLoginId',
      }),
    ).eql(true);
  });

  it('getAllTrustRelationships', async () => {
    const getAllWalletsStub = sinon
      .stub(Wallet.prototype, 'getAllWallets')
      .resolves({ wallets: [{ id: 'id1' }, { id: 'id2' }] });
    const getTrustRelationshipsStub = sinon.stub(
      TrustService.prototype,
      'getTrustRelationships',
    );
    getTrustRelationshipsStub
      .onFirstCall()
      .resolves([
        { id: 'trustId1' },
        { id: 'trustId2' },
        { id: 'trustId3' },
        { id: 'trustId4' },
      ]);
    getTrustRelationshipsStub
      .onSecondCall()
      .resolves([
        { id: 'trustId1' },
        { id: 'trustId2' },
        { id: 'trustId5' },
        { id: 'trustId6' },
      ]);

    const trustRelationships = await trustService.getAllTrustRelationships({
      walletId: 'walletId',
      state: 'state',
      type: 'type',
      request_type: 'request_type',
    });
    expect(trustRelationships).eql([
      { id: 'trustId1' },
      { id: 'trustId2' },
      { id: 'trustId3' },
      { id: 'trustId4' },
      { id: 'trustId5' },
      { id: 'trustId6' },
    ]);
    expect(getAllWalletsStub.calledOnceWithExactly('walletId')).eql(true);
    expect(
      getTrustRelationshipsStub.getCall(0).calledWithExactly({
        walletId: 'id1',
        state: 'state',
        type: 'type',
        request_type: 'request_type',
      }),
    ).eql(true);
    expect(
      getTrustRelationshipsStub.getCall(1).calledWithExactly({
        walletId: 'id2',
        state: 'state',
        type: 'type',
        request_type: 'request_type',
      }),
    ).eql(true);
  });

  describe('createTrustRelationship', () => {
    let getByIdStub;
    let getByNameStub;
    let requestTrustStub;

    beforeEach(() => {
      getByIdStub = sinon
        .stub(WalletService.prototype, 'getById')
        .resolves({ wallet: 'wallet' });
      getByNameStub = sinon.stub(WalletService.prototype, 'getByName');
      requestTrustStub = sinon
        .stub(Trust.prototype, 'requestTrustFromAWallet')
        .resolves('trustRelationship');
    });

    it('createTrustRelationship -- no requester wallet', async () => {
      getByNameStub.resolves('requesteeWallet');
      const trustRelationship = await trustService.createTrustRelationship({
        walletLoginId: 'walletLoginId',
        requesteeWallet: 'requesteeWallet',
        trustRequestType: 'trustRequestType',
      });
      expect(trustRelationship).eql('trustRelationship');
      expect(getByIdStub.calledOnceWithExactly('walletLoginId')).eql(true);
      expect(getByNameStub.calledOnceWithExactly('requesteeWallet')).eql(true);
      expect(
        requestTrustStub.calledOnceWithExactly({
          trustRequestType: 'trustRequestType',
          requesterWallet: { wallet: 'wallet' },
          requesteeWallet: 'requesteeWallet',
          originatorWallet: { wallet: 'wallet' },
        }),
      ).eql(true);
    });

    it('createTrustRelationship -- with requester wallet', async () => {
      getByNameStub.onFirstCall().resolves('requesteeWallet');
      getByNameStub.onSecondCall().resolves('requesterWallet');
      const trustRelationship = await trustService.createTrustRelationship({
        walletLoginId: 'walletLoginId',
        requesteeWallet: 'requesteeWallet',
        requesterWallet: 'requesterWallet',
        trustRequestType: 'trustRequestType',
      });
      expect(trustRelationship).eql('trustRelationship');
      expect(getByIdStub.calledOnceWithExactly('walletLoginId')).eql(true);
      expect(getByNameStub.getCall(0).calledWithExactly('requesteeWallet')).eql(
        true,
      );
      expect(getByNameStub.getCall(1).calledWithExactly('requesterWallet')).eql(
        true,
      );
      expect(
        requestTrustStub.calledOnceWithExactly({
          trustRequestType: 'trustRequestType',
          requesterWallet: 'requesterWallet',
          requesteeWallet: 'requesteeWallet',
          originatorWallet: { wallet: 'wallet' },
        }),
      ).eql(true);
    });
  });

  describe('trustRelationshipGetById', async () => {
      const trustRelationshipGetByIdStub = sinon
          .stub(Trust.prototype, 'trustRelationshipGetById')
          .resolves('trustRelationship');

      const trustRelationship = await trustService.trustRelationshipGetById({
          walletId: 'walletId',
          trustRelationshipId: 'id'
      });

      expect(trustRelationship).eql('trustRelationship');
      expect(
          trustRelationshipGetByIdStub.calledOnceWithExactly({
              walletId: 'walletId',
              trustRelationshipId: 'id'
          }),
      ).eql(true);
  })
});
