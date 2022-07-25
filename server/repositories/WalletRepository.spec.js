const { expect } = require('chai');
const uuid = require('uuid');
const jestExpect = require('expect');
const mockKnex = require('mock-knex');
const WalletRepository = require('./WalletRepository');
const knex = require('../infra/database/knex');

const tracker = mockKnex.getTracker();
const Session = require('../infra/database/Session');

describe('WalletRepository', () => {
  let walletRepository;

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    walletRepository = new WalletRepository(new Session());
  });

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it('getByName', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query) => {
      expect(query.sql).match(/select.*wallet.*/);
      query.response([{ id: 1 }]);
    });
    const entity = await walletRepository.getByName('Dadior');
    expect(entity).to.be.a('object');
  });

  it('getByName can not find the wallet name', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query) => {
      expect(query.sql).match(/select.*wallet.*/);
      query.response([]);
    });
    await jestExpect(async () => {
      await walletRepository.getByName('Dadior');
    }).rejects.toThrow(/Could not find entity/);
  });

  it('getById', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query) => {
      expect(query.sql).match(/select.*wallet.*where.*id/);
      query.response([{ id: 1 }]);
    });
    const entity = await walletRepository.getById(uuid.v4());
    expect(entity).to.be.a('object');
  });

  it('getById can not find the wallet id', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query) => {
      expect(query.sql).match(/select.*wallet.*where.*id/);
      query.response([]);
    });
    await jestExpect(async () => {
      await walletRepository.getById(uuid.v4());
    }).rejects.toThrow(/Could not find wallet/);
  });

  it('getAllWallets', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query) => {
      expect(query.sql).match(
        /select.*wallet.*where.*actor_wallet_id.*request_type.*/,
      );
      query.response([{ id: 1 }]);
    });
    const entity = await walletRepository.getAllWallets(uuid.v4());
    expect(entity).to.be.a('array');
  });
});
