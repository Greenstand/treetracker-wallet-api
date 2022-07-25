const { expect } = require('chai');
const mockKnex = require('mock-knex');
const TransactionRepository = require('./TransactionRepository');
const knex = require('../infra/database/knex');
const Session = require('../infra/database/Session');

const tracker = mockKnex.getTracker();

describe('TransactionRepository', () => {
  let transactionRepository;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    transactionRepository = new TransactionRepository(new Session());
  });

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it('getByFilter', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query) => {
      expect(query.sql).match(
        /select.*transaction.*source_wallet.*sender_wallet.*/,
      );
      query.response({ id: 1 });
    });
    const entity = await transactionRepository.getByFilter({});
    expect(entity).to.be.a('object');
  });
});
