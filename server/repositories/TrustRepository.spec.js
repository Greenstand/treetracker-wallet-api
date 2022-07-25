const { expect } = require('chai');
const mockKnex = require('mock-knex');
const uuid = require('uuid');
const TrustRepository = require('./TrustRepository');
const knex = require('../infra/database/knex');

const tracker = mockKnex.getTracker();
const Session = require('../infra/database/Session');

describe('TrustRepository', () => {
  let trustRepository;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    trustRepository = new TrustRepository(new Session());
  });

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it('getByOriginatorId', async () => {
    tracker.on('query', (query) => {
      expect(query.sql).match(
        /select.*wallet_trust.*where.*originator_wallet_id/,
      );
      query.response([{ id: 1 }]);
    });
    const entity = await trustRepository.getByOriginatorId(uuid.v4());
    expect(entity).to.be.a('array');
  });

  it('getTrustedByOriginatorId', async () => {
    tracker.on('query', (query) => {
      expect(query.sql).match(
        /select.*wallet_trust.*where.*originator_wallet_id.*state/,
      );
      query.response([{ id: 1 }]);
    });
    const entity = await trustRepository.getTrustedByOriginatorId(uuid.v4());
    expect(entity).to.be.a('array');
  });

  it('getByTargetId', async () => {
    tracker.on('query', (query) => {
      expect(query.sql).match(/select.*wallet_trust.*where.*target_wallet_id/);
      query.response([{ id: 1 }]);
    });
    const entity = await trustRepository.getByTargetId(uuid.v4());
    expect(entity).to.be.a('array');
  });

  it('getByFilter', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query) => {
      expect(query.sql).match(
        /select.*wallet_trust.*originating_wallet.*actor_wallet.*target_wallet/,
      );
      query.response([{}]);
    });
    await trustRepository.getByFilter({});
  });
});
