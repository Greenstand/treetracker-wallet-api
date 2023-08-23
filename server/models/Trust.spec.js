const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const { v4: uuid } = require('uuid');
const Wallet = require('./Wallet');
const Trust = require('./Trust');

chai.use(sinonChai);
const { expect } = chai;
const TrustRepository = require('../repositories/TrustRepository');
const Session = require('../infra/database/Session');
const TrustRelationshipEnums = require('../utils/trust-enums');

describe('Trust Model', () => {
  let trustModel;
  let trustRepositoryStub;

  beforeEach(() => {
    const session = new Session();
    trustModel = new Trust(session);
    trustRepositoryStub = sinon.stub(TrustRepository.prototype);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getTrustRelationships', () => {
    const walletId = uuid();
    const filter = {
      and: [
        {
          or: [
            { actor_wallet_id: walletId },
            { target_wallet_id: walletId },
            { originator_wallet_id: walletId },
          ],
        },
      ],
    };

    it('should get relationships', async () => {
      trustRepositoryStub.getByFilter.resolves(['relationship1']);
      const result = await trustModel.getTrustRelationships({
        walletId,
        limit: 10,
        offset: 1,
      });
      expect(result).eql(['relationship1']);
      expect(trustRepositoryStub.getByFilter).calledOnceWithExactly(filter, {
        limit: 10,
        offset: 1,
      });
    });

    it('should get relationships -- state', async () => {
      trustRepositoryStub.getByFilter.resolves(['relationship2']);
      const result = await trustModel.getTrustRelationships({
        walletId,
        limit: 10,
        offset: 1,
        state: 'state',
      });
      expect(result).eql(['relationship2']);
      const filterCopy = JSON.parse(JSON.stringify(filter));
      filterCopy.and.push({ state: 'state' });
      expect(trustRepositoryStub.getByFilter).calledOnceWithExactly(
        filterCopy,
        {
          limit: 10,
          offset: 1,
        },
      );
    });

    it('should get relationships -- type', async () => {
      trustRepositoryStub.getByFilter.resolves(['relationship3']);
      const result = await trustModel.getTrustRelationships({
        walletId,
        limit: 10,
        offset: 11,
        type: 'type',
      });
      const filterCopy = JSON.parse(JSON.stringify(filter));
      filterCopy.and.push({ type: 'type' });
      expect(result).eql(['relationship3']);
      expect(trustRepositoryStub.getByFilter).calledOnceWithExactly(
        filterCopy,
        {
          limit: 10,
          offset: 11,
        },
      );
    });

    it('should get relationships -- request_type', async () => {
      trustRepositoryStub.getByFilter.resolves(['relationship4']);
      const result = await trustModel.getTrustRelationships({
        walletId,
        limit: 101,
        offset: 1,
        request_type: 'request_type',
      });
      const filterCopy = JSON.parse(JSON.stringify(filter));
      filterCopy.and.push({ request_type: 'request_type' });
      expect(result).eql(['relationship4']);
      expect(trustRepositoryStub.getByFilter).calledOnceWithExactly(
        filterCopy,
        {
          limit: 101,
          offset: 1,
        },
      );
    });

    it('should get relationships -- state, type, request_type', async () => {
      trustRepositoryStub.getByFilter.resolves(['relationship1']);
      const result = await trustModel.getTrustRelationships({
        walletId,
        limit: 100,
        offset: 0,
        state: 'state',
        request_type: 'request_type',
        type: 'type',
      });
      const filterCopy = JSON.parse(JSON.stringify(filter));
      filterCopy.and.push({ state: 'state' });
      filterCopy.and.push({ type: 'type' });
      filterCopy.and.push({ request_type: 'request_type' });
      expect(result).eql(['relationship1']);
      expect(trustRepositoryStub.getByFilter).calledOnceWithExactly(
        filterCopy,
        {
          limit: 100,
          offset: 0,
        },
      );
    });
  });

  it('getTrustRelationshipsTrusted', async () => {
    const walletId = uuid();
    const getTrustRelationshipStub = sinon
      .stub(Trust.prototype, 'getTrustRelationships')
      .resolves(['trusted_relationship']);

    const result = await trustModel.getTrustRelationshipsTrusted(walletId);
    expect(result).eql(['trusted_relationship']);
    expect(getTrustRelationshipStub).calledOnceWithExactly({
      walletId,
      state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
    });
  });

  describe('requestTrustFromAWallet', () => {
    const trustRequestType = 'send';
    const requesterWallet = { id: uuid(), name: 'requester' };
    const requesteeWallet = { id: uuid(), name: 'requestee' };
    const originatorWallet = { id: uuid(), name: 'originator' };

    let hasControlStub;
    let checkDuplicateStub;

    beforeEach(() => {
      hasControlStub = sinon.stub(Wallet.prototype, 'hasControlOver');
      checkDuplicateStub = sinon
        .stub(Trust.prototype, 'checkDuplicateRequest')
        .resolves();
    });

    it('should error out -- does not have control', async () => {
      hasControlStub.resolves(false);
      let error;
      try {
        await trustModel.requestTrustFromAWallet({
          trustRequestType,
          requesteeWallet,
          requesterWallet,
          originatorWallet,
        });
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(403);
      expect(error.message).eql('Have no permission to deal with this actor');
      expect(hasControlStub).calledOnceWithExactly(
        originatorWallet.id,
        requesterWallet.id,
      );
      expect(checkDuplicateStub).not.called;
      expect(trustRepositoryStub.create).not.called;
    });

    it('should request trust', async () => {
      hasControlStub.resolves(true);
      const resultObject = {
        id: uuid(),
        type: 'type',
        request_type: 'request_type',
        state: 'state',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: true,
      };
      trustRepositoryStub.create.resolves(resultObject);

      const result = await trustModel.requestTrustFromAWallet({
        trustRequestType,
        requesteeWallet,
        requesterWallet,
        originatorWallet,
      });

      expect(result).eql({
        id: resultObject.id,
        actor_wallet: requesterWallet.name,
        originator_wallet: originatorWallet.name,
        target_wallet: requesteeWallet.name,
        type: resultObject.type,
        request_type: resultObject.request_type,
        state: resultObject.state,
        created_at: resultObject.created_at,
        updated_at: resultObject.updated_at,
        active: resultObject.active,
      });
      expect(hasControlStub).calledOnceWithExactly(
        originatorWallet.id,
        requesterWallet.id,
      );
      expect(checkDuplicateStub).calledOnceWithExactly({
        walletId: originatorWallet.id,
        trustRelationship: {
          type: TrustRelationshipEnums.getTrustTypeByRequestType(
            trustRequestType,
          ),
          request_type: trustRequestType,
          actor_wallet_id: requesterWallet.id,
          originator_wallet_id: originatorWallet.id,
          target_wallet_id: requesteeWallet.id,
          state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
        },
      });
      expect(trustRepositoryStub.create).calledOnceWithExactly({
        type: TrustRelationshipEnums.getTrustTypeByRequestType(
          trustRequestType,
        ),
        request_type: trustRequestType,
        actor_wallet_id: requesterWallet.id,
        originator_wallet_id: originatorWallet.id,
        target_wallet_id: requesteeWallet.id,
        state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
      });
    });
  });

  describe('checkDuplicateRequest', () => {
    let getTrustRelationshipStub;

    beforeEach(() => {
      getTrustRelationshipStub = sinon.stub(
        Trust.prototype,
        'getTrustRelationships',
      );
    });

    it('should error out -- Not supported type', async () => {
      getTrustRelationshipStub.resolves();
      const walletId = uuid();
      let error;
      try {
        await trustModel.checkDuplicateRequest({
          walletId,
          trustRelationship: { type: 'type' },
        });
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(500);
      expect(error.message).eql('Not supported type');
      expect(getTrustRelationshipStub).calledOnceWithExactly({ walletId });
    });

    it('should error out -- duplicate found: same request type, same actor, same target', async () => {
      getTrustRelationshipStub.resolves([
        {
          request_type: 'request_type',
          actor_wallet_id: 'actor_wallet_id',
          target_wallet_id: 'target_wallet_id',
          state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.requested,
        },
      ]);
      const walletId = uuid();
      let error;
      try {
        await trustModel.checkDuplicateRequest({
          walletId,
          trustRelationship: {
            type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
            request_type: 'request_type',
            actor_wallet_id: 'actor_wallet_id',
            target_wallet_id: 'target_wallet_id',
          },
        });
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(403);
      expect(error.message).eql(
        'The trust relationship has been requested or trusted',
      );
      expect(getTrustRelationshipStub).calledOnceWithExactly({ walletId });
    });

    it(`should error out -- 
        duplicate found: different request_type, 
        incoming actor is the existing target, 
        incoming target is the existing actor`, async () => {
      getTrustRelationshipStub.resolves([
        {
          request_type: 'request_type_2',
          actor_wallet_id: 'target_wallet_id',
          target_wallet_id: 'actor_wallet_id',
          state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
        },
      ]);
      let error;
      const walletId = uuid();
      try {
        await trustModel.checkDuplicateRequest({
          walletId,
          trustRelationship: {
            type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
            request_type: 'request_type',
            actor_wallet_id: 'actor_wallet_id',
            target_wallet_id: 'target_wallet_id',
          },
        });
      } catch (e) {
        error = e;
      }
      expect(error.code).eql(403);
      expect(error.message).eql(
        'The trust relationship has been requested or trusted',
      );
      expect(getTrustRelationshipStub).calledOnceWithExactly({ walletId });
    });

    it('No duplicated trust', async () => {
      getTrustRelationshipStub.resolves([]);
      let error;
      const walletId = uuid();
      try {
        await trustModel.checkDuplicateRequest({
          walletId,
          trustRelationship: {
            type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
            request_type: 'request_type',
            actor_wallet_id: 'actor_wallet_id',
            target_wallet_id: 'target_wallet_id',
          },
        });
      } catch (e) {
        error = e;
      }
      expect(error).eql(undefined);
      expect(getTrustRelationshipStub).calledOnceWithExactly({ walletId });
    });
  });

  describe('checkManageCircle', () => {
    let getTrustedRelationshipStub;

    beforeEach(() => {
      getTrustedRelationshipStub = sinon.stub(
        Trust.prototype,
        'getTrustRelationshipsTrusted',
      );
    });

    describe('trust relationship request type is manage', () => {
      it(`should error out -- 
        incoming actor is the existing target,
        incoming target is the existing actor
        existing request type -- manage`, async () => {
        getTrustedRelationshipStub.resolves([
          {
            request_type:
              TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
            type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
            actor_wallet_id: 'actor_wallet_id',
            target_wallet_id: 'target_wallet_id',
          },
        ]);
        let error;
        const walletId = uuid();
        try {
          await trustModel.checkManageCircle({
            walletId,
            trustRelationship: {
              type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
              request_type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
              target_wallet_id: 'actor_wallet_id',
              actor_wallet_id: 'target_wallet_id',
            },
          });
        } catch (e) {
          error = e;
        }
        expect(error.code).eql(403);
        expect(error.message).eql(
          'Operation forbidden, because this would lead to a management circle',
        );
        expect(getTrustedRelationshipStub).calledOnceWithExactly(walletId);
      });

      it(`should error out -- 
        incoming actor is the existing actor,
        incoming target is the existing target
        existing request type -- yield`, async () => {
        getTrustedRelationshipStub.resolves([
          {
            request_type:
              TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
            type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
            actor_wallet_id: 'actor_wallet_id',
            target_wallet_id: 'target_wallet_id',
          },
        ]);
        let error;
        const walletId = uuid();
        try {
          await trustModel.checkManageCircle({
            walletId,
            trustRelationship: {
              type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
              request_type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
              target_wallet_id: 'target_wallet_id',
              actor_wallet_id: 'actor_wallet_id',
            },
          });
        } catch (e) {
          error = e;
        }
        expect(error.code).eql(403);
        expect(error.message).eql(
          'Operation forbidden, because this would lead to a management circle',
        );
        expect(getTrustedRelationshipStub).calledOnceWithExactly(walletId);
      });
    });

    describe('trust relationship request type is yield', () => {
      it(`should error out -- 
        incoming actor is the existing target,
        incoming target is the existing actor
        existing request type -- yield`, async () => {
        getTrustedRelationshipStub.resolves([
          {
            request_type:
              TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
            type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
            actor_wallet_id: 'actor_wallet_id',
            target_wallet_id: 'target_wallet_id',
          },
        ]);
        let error;
        const walletId = uuid();
        try {
          await trustModel.checkManageCircle({
            walletId,
            trustRelationship: {
              type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
              request_type:
                TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
              target_wallet_id: 'actor_wallet_id',
              actor_wallet_id: 'target_wallet_id',
            },
          });
        } catch (e) {
          error = e;
        }
        expect(error.code).eql(403);
        expect(error.message).eql(
          'Operation forbidden, because this would lead to a management circle',
        );
        expect(getTrustedRelationshipStub).calledOnceWithExactly(walletId);
      });

      it(`should error out -- 
        incoming actor is the existing actor,
        incoming target is the existing target
        existing request type -- manage`, async () => {
        getTrustedRelationshipStub.resolves([
          {
            request_type:
              TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
            type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
            actor_wallet_id: 'actor_wallet_id',
            target_wallet_id: 'target_wallet_id',
          },
        ]);
        let error;
        const walletId = uuid();
        try {
          await trustModel.checkManageCircle({
            walletId,
            trustRelationship: {
              request_type:
                TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield,
              type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
              target_wallet_id: 'target_wallet_id',
              actor_wallet_id: 'actor_wallet_id',
            },
          });
        } catch (e) {
          error = e;
        }
        expect(error.code).eql(403);
        expect(error.message).eql(
          'Operation forbidden, because this would lead to a management circle',
        );
        expect(getTrustedRelationshipStub).calledOnceWithExactly(walletId);
      });
    });
  });

  it('getTrustRelationshipsRequestedToMe', async () => {
    const walletId1 = uuid();
    const walletId2 = uuid();
    const walletId3 = uuid();
    const getAllWalletStub = sinon
      .stub(Wallet.prototype, 'getAllWallets')
      .resolves({
        wallets: [{ id: walletId1 }, { id: walletId2 }, { id: walletId3 }],
      });
    const getTrustRelationshipsStub = sinon.stub(
      Trust.prototype,
      'getTrustRelationships',
    );
    getTrustRelationshipsStub
      .onCall(0)
      .resolves([{ target_wallet_id: walletId1 }]);
    getTrustRelationshipsStub
      .onCall(1)
      .resolves([{ target_wallet_id: walletId2 }]);
    getTrustRelationshipsStub
      .onCall(2)
      .resolves([{ target_wallet_id: uuid() }]);

    const result = await trustModel.getTrustRelationshipsRequestedToMe(
      walletId1,
    );

    expect(result).eql([
      { target_wallet_id: walletId1 },
      { target_wallet_id: walletId2 },
    ]);
    expect(getTrustRelationshipsStub.getCall(0).args[0]).eql({
      walletId: walletId1,
    });
    expect(getTrustRelationshipsStub.getCall(1).args[0]).eql({
      walletId: walletId2,
    });
    expect(getTrustRelationshipsStub.getCall(2).args[0]).eql({
      walletId: walletId3,
    });
    expect(getTrustRelationshipsStub).calledThrice;
    expect(getAllWalletStub).calledOnceWithExactly(walletId1);
  });

  it('updateTrustState', async () => {
    trustRepositoryStub.update.resolves({ status: 'updated' });

    const result = await trustModel.updateTrustState(
      {
        id: 'trustId',
        originating_wallet: 'originating_wallet',
        actor_wallet: 'actor_wallet',
        target_wallet: 'target_wallet',
      },
      'new state',
    );

    expect(result).eql({
      id: 'trustId',
      originating_wallet: 'originating_wallet',
      actor_wallet: 'actor_wallet',
      target_wallet: 'target_wallet',
      status: 'updated',
    });

    expect(trustRepositoryStub.update).calledOnceWithExactly({
      id: 'trustId',
      state: 'new state',
    });
  });

  describe('acceptTrustRequestSentToMe', () => {
    let getTrustRelationshipsRequestedToMeStub;
    let checkManageCircleStub;
    let updateTrustStateStub;

    beforeEach(() => {
      getTrustRelationshipsRequestedToMeStub = sinon.stub(
        Trust.prototype,
        'getTrustRelationshipsRequestedToMe',
      );
      checkManageCircleStub = sinon.stub(Trust.prototype, 'checkManageCircle');
      updateTrustStateStub = sinon.stub(Trust.prototype, 'updateTrustState');
    });

    it('should error out -- no permission to accept', async () => {
      getTrustRelationshipsRequestedToMeStub.resolves([]);
      const trustRelationshipId = uuid();
      const walletId = uuid();
      let error;
      try {
        await trustModel.acceptTrustRequestSentToMe({
          trustRelationshipId,
          walletId,
        });
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(404);
      expect(error.message).eql(
        'No such trust relationship exists or it is not associated with the current wallet.',
      );
      expect(getTrustRelationshipsRequestedToMeStub).calledOnceWithExactly(
        walletId,
      );
      expect(checkManageCircleStub).not.called;
      expect(updateTrustStateStub).not.called;
    });

    it('should accept', async () => {
      const trustRelationshipId = uuid();
      const walletId = uuid();

      getTrustRelationshipsRequestedToMeStub.resolves([
        { id: uuid() },
        { id: trustRelationshipId },
      ]);
      updateTrustStateStub.resolves('state updated');
      const result = await trustModel.acceptTrustRequestSentToMe({
        trustRelationshipId,
        walletId,
      });

      expect(result).eql('state updated');

      expect(getTrustRelationshipsRequestedToMeStub).calledOnceWithExactly(
        walletId,
      );
      expect(checkManageCircleStub).calledOnceWithExactly({
        walletId,
        trustRelationship: { id: trustRelationshipId },
      });
      expect(updateTrustStateStub).calledOnceWithExactly(
        { id: trustRelationshipId },
        TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
      );
    });
  });

  describe('declineTrustRequestSentToMe', () => {
    let getTrustRelationshipsRequestedToMeStub;
    let updateTrustStateStub;

    beforeEach(() => {
      getTrustRelationshipsRequestedToMeStub = sinon.stub(
        Trust.prototype,
        'getTrustRelationshipsRequestedToMe',
      );
      updateTrustStateStub = sinon.stub(Trust.prototype, 'updateTrustState');
    });

    it('should error out -- no permission to accept', async () => {
      getTrustRelationshipsRequestedToMeStub.resolves([]);
      const trustRelationshipId = uuid();
      const walletId = uuid();
      let error;
      try {
        await trustModel.declineTrustRequestSentToMe({
          trustRelationshipId,
          walletId,
        });
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(404);
      expect(error.message).eql(
        'No such trust relationship exists or it is not associated with the current wallet.',
      );
      expect(getTrustRelationshipsRequestedToMeStub).calledOnceWithExactly(
        walletId,
      );
      expect(updateTrustStateStub).not.called;
    });

    it('should decline', async () => {
      const trustRelationshipId = uuid();
      const walletId = uuid();

      getTrustRelationshipsRequestedToMeStub.resolves([
        { id: uuid() },
        { id: trustRelationshipId },
      ]);
      updateTrustStateStub.resolves('state declined');
      const result = await trustModel.declineTrustRequestSentToMe({
        trustRelationshipId,
        walletId,
      });

      expect(result).eql('state declined');

      expect(getTrustRelationshipsRequestedToMeStub).calledOnceWithExactly(
        walletId,
      );
      expect(updateTrustStateStub).calledOnceWithExactly(
        { id: trustRelationshipId },
        TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.canceled_by_target,
      );
    });
  });

  describe('cancelTrustRequest', () => {
    let updateTrustStateStub;

    beforeEach(() => {
      updateTrustStateStub = sinon.stub(Trust.prototype, 'updateTrustState');
    });

    it('should error out -- no permission to accept', async () => {
      trustRepositoryStub.getByFilter.resolves([]);
      const trustRelationshipId = uuid();
      const walletId = uuid();

      const filter = {
        and: [
          {
            or: [
              { actor_wallet_id: walletId },
              { target_wallet_id: walletId },
              { originator_wallet_id: walletId },
            ],
          },
          {
            'wallet_trust.id': trustRelationshipId,
          },
        ],
      };

      let error;
      try {
        await trustModel.cancelTrustRequest({
          trustRelationshipId,
          walletId,
        });
      } catch (e) {
        error = e;
      }

      expect(error.code).eql(404);
      expect(error.message).eql(
        'No such trust relationship exists or it is not associated with the current wallet.',
      );
      expect(trustRepositoryStub.getByFilter).calledOnceWithExactly(filter);
      expect(updateTrustStateStub).not.called;
    });

    it('should cancel', async () => {
      const trustRelationshipId = uuid();
      const walletId = uuid();

      const filter = {
        and: [
          {
            or: [
              { actor_wallet_id: walletId },
              { target_wallet_id: walletId },
              { originator_wallet_id: walletId },
            ],
          },
          {
            'wallet_trust.id': trustRelationshipId,
          },
        ],
      };

      trustRepositoryStub.getByFilter.resolves([
        { originator_wallet_id: walletId, id: trustRelationshipId },
      ]);
      updateTrustStateStub.resolves('state cancelled');
      const result = await trustModel.cancelTrustRequest({
        trustRelationshipId,
        walletId,
      });

      expect(result).eql('state cancelled');

      expect(trustRepositoryStub.getByFilter).calledOnceWithExactly(filter);
      expect(updateTrustStateStub).calledOnceWithExactly(
        { originator_wallet_id: walletId, id: trustRelationshipId },
        TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.cancelled_by_originator,
      );
    });
  });

  describe('hasTrust', () => {
    let getTrustRelationshipsTrustedStub;

    beforeEach(() => {
      getTrustRelationshipsTrustedStub = sinon.stub(
        Trust.prototype,
        'getTrustRelationshipsTrusted',
      );
    });

    it('should return true -- actor=sender, target=receiver, request type = send', async () => {
      getTrustRelationshipsTrustedStub.resolves([
        {
          actor_wallet_id: 'actor_wallet_id',
          target_wallet_id: 'target_wallet_id',
          request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
        },
      ]);
      const walletLoginId = uuid();

      const result = await trustModel.hasTrust(
        walletLoginId,
        TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
        { id: 'actor_wallet_id' },
        { id: 'target_wallet_id' },
      );

      expect(result).eql(true);
      expect(getTrustRelationshipsTrustedStub).calledOnceWithExactly(
        walletLoginId,
      );
    });

    it('should return true -- actor=receiver, target=sender, request type = receive', async () => {
      getTrustRelationshipsTrustedStub.resolves([
        {
          actor_wallet_id: 'actor_wallet_id',
          target_wallet_id: 'target_wallet_id',
          request_type:
            TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.receive,
        },
      ]);
      const walletLoginId = uuid();

      const result = await trustModel.hasTrust(
        walletLoginId,
        TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.receive,
        { id: 'target_wallet_id' },
        { id: 'actor_wallet_id' },
      );

      expect(result).eql(true);
      expect(getTrustRelationshipsTrustedStub).calledOnceWithExactly(
        walletLoginId,
      );
    });

    it('should return false -- actor=receiver, target=sender, request type = send', async () => {
      getTrustRelationshipsTrustedStub.resolves([
        {
          actor_wallet_id: 'actor_wallet_id',
          target_wallet_id: 'target_wallet_id',
          request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
        },
      ]);
      const walletLoginId = uuid();

      const result = await trustModel.hasTrust(
        walletLoginId,
        TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.receive,
        { id: 'target_wallet_id' },
        { id: 'actor_wallet_id' },
      );

      expect(result).eql(false);
      expect(getTrustRelationshipsTrustedStub).calledOnceWithExactly(
        walletLoginId,
      );
    });

    it('should return false ', async () => {
      getTrustRelationshipsTrustedStub.resolves([]);
      const walletLoginId = uuid();

      const result = await trustModel.hasTrust(
        walletLoginId,
        TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.receive,
        { id: 'target_wallet_id' },
        { id: 'actor_wallet_id' },
      );

      expect(result).eql(false);
      expect(getTrustRelationshipsTrustedStub).calledOnceWithExactly(
        walletLoginId,
      );
    });

    it('should error out -- invalid  trustType received ', async () => {
      const walletLoginId = uuid();
      let error;

      try {
        await trustModel.hasTrust(
          walletLoginId,
          'trust type',
          { id: 'target_wallet_id' },
          { id: 'actor_wallet_id' },
        );
      } catch (e) {
        error = e;
      }

      // expect(error.toString()).eql(
      //   `Error: [assert failed] expect 'trust type' --to-->  one of ["send","receive","manage","yield","deduct","release"]`,
      // );
      expect(error.toString()).eql(
        `ValidationError: "value" must be one of [send, receive, manage, yield, deduct, release]`,
      );
      expect(getTrustRelationshipsTrustedStub).not.called;
    });
  });

  describe('getTrustRelationshipById', () => {
    const walletId = uuid();
    const trustRelationshipId = uuid()
    const filter = {
      and: [
        {
          or: [
            { actor_wallet_id: walletId },
            { target_wallet_id: walletId },
            { originator_wallet_id: walletId },
          ],
        },
        {
          'wallet_trust.id': trustRelationshipId,
        },
      ],
    };

    it('should get relationship', async () => {
      trustRepositoryStub.getByFilter.resolves(['trustRelationship']);
      const result = await trustModel.getTrustRelationshipById({
        walletId,
        trustRelationshipId
      });
      expect(result).eql('trustRelationship');
      expect(trustRepositoryStub.getByFilter).calledOnceWithExactly(
          {...filter}
      );
    });
  })
});
