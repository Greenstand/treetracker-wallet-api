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

  it('getAllWallets -- without count', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query) => {
      expect(query.sql).match(
        /select.*wallet.*where.*actor_wallet_id.*request_type.*/,
      );
      // Four selects since #900: the wallet itself, both trust unions, and
      // the union of wallets sharing its keycloak account.
      expect(query.sql.match(/display_name/g)).to.have.length(4);
      expect(query.sql.match(/cover_url/g)).to.have.length(4);
      query.response([{ id: 1 }]);
    });
    const entity = await walletRepository.getAllWallets(uuid.v4());
    expect(entity).to.eql({ wallets: [{ id: 1 }] });
  });

  it('getAllWallets -- with count', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query, step) => {
      if (step === 1) {
        expect(query.sql).match(
          /select.*wallet.*where.*actor_wallet_id.*request_type.*/,
        );
        query.response([{ id: 1 }]);
      } else if (step === 2) {
        expect(query.sql).match(
          /select.*count.*where.*actor_wallet_id.*request_type.*name.*/,
        );
        query.response([{ count: 1 }]);
      }
    });
    const entity = await walletRepository.getAllWallets(
      uuid.v4(),
      { limit: 1 },
      'wallet',
      'created_at',
      'desc',
      undefined,
      undefined,
      true,
    );
    expect(entity).to.eql({ wallets: [{ id: 1 }], count: 1 });
  });

  // The admin listing must not be scoped to a caller: no wallet_trust join and
  // no wallet id in the where clause (#1239).
  it('getAllWalletsAdmin queries every wallet, with no caller scope', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query, step) => {
      if (step === 1) {
        expect(query.sql).match(/select.*count.*from "wallet"/);
        expect(query.sql).not.match(/wallet_trust/);
        expect(query.sql).not.match(/keycloak_account_id/);
        query.response([{ count: 7 }]);
      } else {
        expect(query.sql).match(/select.*from "wallet".*order by.*limit/);
        expect(query.sql).not.match(/wallet_trust/);
        query.response([{ id: 1 }]);
      }
    });

    const entity = await walletRepository.getAllWalletsAdmin({
      limit: 10,
      offset: 0,
      sort_by: 'created_at',
      order: 'desc',
    });

    expect(entity).to.eql({ wallets: [{ id: 1 }], count: 7 });
  });

  it('getAllWalletsAdmin filters by name when one is given', async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', (query, step) => {
      expect(query.sql).match(/"name" ilike/);
      query.response(step === 1 ? [{ count: 1 }] : [{ id: 1 }]);
    });

    await walletRepository.getAllWalletsAdmin({
      limit: 10,
      offset: 0,
      name: 'wal',
      sort_by: 'name',
      order: 'asc',
    });
  });
});
