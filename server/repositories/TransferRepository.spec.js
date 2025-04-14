const { expect } = require('chai');
const mockKnex = require('mock-knex');
const uuid = require('uuid');
const TransferRepository = require('./TransferRepository');
const knex = require('../infra/database/knex');

const tracker = mockKnex.getTracker();
const Session = require('../infra/database/Session');

describe('TransferRepository', () => {
  let transferRepository;

  const originatorWalletId = uuid.v4();
  const sourceWalletId = uuid.v4();
  const destinationWalletId = uuid.v4();

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    transferRepository = new TransferRepository(new Session());
  });

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it('create', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/insert.*transfer.*select.*inserted.*/);
          query.response([{ id: 1 }]);
        },
      ][step - 1]();
    });
    const result = await transferRepository.create({
      originator_wallet_id: originatorWalletId,
      source_wallet_id: sourceWalletId,
      destination_wallet_id: destinationWalletId,
    });
    expect(result).property('id').a('number');
  });

  it('update', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/update.*transfer.*select.*updated.*/);
          query.response([{ id: 1 }]);
        },
      ][step - 1]();
    });
    const result = await transferRepository.update({
      originator_wallet_id: originatorWalletId,
      source_wallet_id: sourceWalletId,
      destination_wallet_id: destinationWalletId,
      id: uuid.v4(),
    });
    expect(result).property('id').a('number');
  });

  it('getByFilter', async () => {
    tracker.uninstall();
    tracker.install();

    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/select.*count.*transfer.*originating_wallet.*source_wallet.*destination_wallet.*p/);
          query.response([{count: '1'}]);
        },
        function secondQuery() {
          expect(query.sql).match(/select.*transfer.*originating_wallet.*source_wallet.*destination_wallet/);
          query.response([{id: uuid.v4()}])
        },
      ][step - 1]();
    });

    const result = await transferRepository.getByFilter({});
    expect(result).property('count').a('number')
    expect(result).property('result').a('array')
    expect(result.result[0]).property('id').a('string');
  });

  it('getPendingTransfers', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(
            /select.*transfer.*where.*destination_wallet_id.*/,
          );
          query.response([{ id: originatorWalletId }]);
        },
      ][step - 1]();
    });
    const result = await transferRepository.getPendingTransfers(1);
    expect(result).lengthOf(1);
  });
});
