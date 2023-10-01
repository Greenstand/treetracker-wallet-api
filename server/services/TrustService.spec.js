const sinon = require('sinon');
const chai = require('chai');
const TrustService = require('./TrustService');
const WalletService = require('./WalletService');
const Wallet = require('../models/Wallet');
const Trust = require('../models/Trust');
const EventService = require('./EventService');

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
      .resolves({ id: 'walletId' });

    const trustRelationship = await trustService.getTrustRelationships({
      walletId: 'walletId',
      state: 'state',
      type: 'type',
      request_type: 'request_type',
      limit: 1,
    });

    expect(trustRelationship).eql(['trustRelationships']);
    expect(
      getWalletStub.calledOnceWithExactly({
        walletId: 'walletId',
      }),
    );
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
    const logEventStub = sinon.stub(EventService.prototype, 'logEvent');
    const getTrustRelationshipsByIdStub = sinon
      .stub(Trust.prototype, 'getTrustRelationshipsById')
      .resolves({ originator_wallet_id: 'originator_wallet_id' });

    const trustRelationship = await trustService.acceptTrustRequestSentToMe({
      trustRelationshipId: 'trustRelationshipId',
      walletLoginId: 'walletLoginId',
    });
    expect(
      getTrustRelationshipsByIdStub.calledOnceWithExactly(
        'trustRelationshipId',
      ),
    );
    expect(
      logEventStub.getCall(0).calledWithExactly({
        wallet_id: 'walletLoginId',
        type: 'trust_request_granted',
        payload: { trustRelationshipId: 'trustRelationshipId' },
      }),
    ).eql(true);
    expect(
      logEventStub.getCall(1).calledWithExactly({
        wallet_id: 'originator_wallet_id',
        type: 'trust_request_granted',
        payload: { trustRelationshipId: 'trustRelationshipId' },
      }),
    ).eql(true);
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
    const logEventStub = sinon.stub(EventService.prototype, 'logEvent');
    const getTrustRelationshipsByIdStub = sinon
      .stub(Trust.prototype, 'getTrustRelationshipsById')
      .resolves({ originator_wallet_id: 'originator_wallet_id' });

    const trustRelationship = await trustService.declineTrustRequestSentToMe({
      trustRelationshipId: 'trustRelationshipId',
      walletLoginId: 'walletLoginId',
    });
    expect(
      getTrustRelationshipsByIdStub.calledOnceWithExactly(
        'trustRelationshipId',
      ),
    );
    expect(
      logEventStub.getCall(0).calledWithExactly({
        wallet_id: 'walletLoginId',
        type: 'trust_request_cancelled_by_target',
        payload: { trustRelationshipId: 'trustRelationshipId' },
      }),
    ).eql(true);
    expect(
      logEventStub.getCall(1).calledWithExactly({
        wallet_id: 'originator_wallet_id',
        type: 'trust_request_cancelled_by_target',
        payload: { trustRelationshipId: 'trustRelationshipId' },
      }),
    ).eql(true);
    expect(trustRelationship).eql('trustRelationship');
    expect(
      declineTrustRelationshipStub.calledOnceWithExactly({
        trustRelationshipId: 'trustRelationshipId',
        walletId: 'walletLoginId',
      }),
    ).eql(true);
  });

  it('cancelTrustRequest', async () => {
    const trustMock = { target_wallet_id: 'target_wallet_id' };

    const cancelTrustRelationshipStub = sinon
      .stub(Trust.prototype, 'cancelTrustRequest')
      .resolves('trustRelationship');
    const logEventStub = sinon.stub(EventService.prototype, 'logEvent');
    const getTrustRelationshipsByIdStub = sinon
      .stub(Trust.prototype, 'getTrustRelationshipsById')
      .resolves(trustMock);

    const trustRelationship = await trustService.cancelTrustRequest({
      trustRelationshipId: 'trustRelationshipId',
      walletLoginId: 'walletLoginId',
    });
    expect(
      getTrustRelationshipsByIdStub.calledOnceWithExactly(
        'trustRelationshipId',
      ),
    );
    expect(
      logEventStub.getCall(0).calledWithExactly({
        wallet_id: 'walletLoginId',
        type: 'trust_request_cancelled_by_originator',
        payload: { trustRelationshipId: 'trustRelationshipId' },
      }),
    ).eql(true);
    expect(
      logEventStub.getCall(1).calledWithExactly({
        wallet_id: trustMock.target_wallet_id,
        type: 'trust_request_cancelled_by_originator',
        payload: { trustRelationshipId: 'trustRelationshipId' },
      }),
    ).eql(true);
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
    let logEventStub;

    beforeEach(() => {
      getByIdStub = sinon.stub(WalletService.prototype, 'getById');
      getByNameStub = sinon.stub(WalletService.prototype, 'getByName');
      requestTrustStub = sinon
        .stub(Trust.prototype, 'requestTrustFromAWallet')
        .resolves('trustRelationship');
      logEventStub = sinon.stub(EventService.prototype, 'logEvent');
    });

    it('createTrustRelationship -- no requester wallet', async () => {
      const requesteeWallet = { name: 'requesteeWallet', id: 'id' };
      const requesterWallet = { name: 'requesterWallet', id: 'id' };
      getByNameStub.resolves(requesteeWallet);
      getByIdStub.resolves(requesterWallet);
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
          requesterWallet: { name: 'requesterWallet', id: 'id' },
          requesteeWallet: { name: 'requesteeWallet', id: 'id' },
          originatorWallet: { name: 'requesterWallet', id: 'id' },
        }),
      ).eql(true);

      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: requesterWallet.id,
          type: 'trust_request',
          payload: {
            requesteeWallet: requesteeWallet.name,
            requesterWallet: requesterWallet.name,
            trustRequestType: 'trustRequestType',
          },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: requesteeWallet.id,
          type: 'trust_request',
          payload: {
            requesteeWallet: requesteeWallet.name,
            requesterWallet: requesterWallet.name,
            trustRequestType: 'trustRequestType',
          },
        }),
      ).eql(true);
    });

    it('createTrustRelationship -- with requester wallet', async () => {
      const requesteeWallet = { name: 'requesteeWallet', id: 'id' };
      const requesterWallet = { name: 'requesterWallet', id: 'id' };
      getByIdStub.resolves(requesterWallet);
      getByNameStub.onFirstCall().resolves(requesteeWallet);
      getByNameStub.onSecondCall().resolves(requesterWallet);
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
          requesterWallet: { name: 'requesterWallet', id: 'id' },
          requesteeWallet: { name: 'requesteeWallet', id: 'id' },
          originatorWallet: { name: 'requesterWallet', id: 'id' },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(0).calledWithExactly({
          wallet_id: requesterWallet.id,
          type: 'trust_request',
          payload: {
            requesteeWallet: requesteeWallet.name,
            requesterWallet: requesterWallet.name,
            trustRequestType: 'trustRequestType',
          },
        }),
      ).eql(true);
      expect(
        logEventStub.getCall(1).calledWithExactly({
          wallet_id: requesteeWallet.id,
          type: 'trust_request',
          payload: {
            requesteeWallet: requesteeWallet.name,
            requesterWallet: requesterWallet.name,
            trustRequestType: 'trustRequestType',
          },
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
      trustRelationshipId: 'id',
    });

    expect(trustRelationship).eql('trustRelationship');
    expect(
      trustRelationshipGetByIdStub.calledOnceWithExactly({
        walletId: 'walletId',
        trustRelationshipId: 'id',
      }),
    ).eql(true);
  });
});
