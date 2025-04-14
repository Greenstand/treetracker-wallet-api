/*
 * Test session mechanism
 */
const jestExpect = require('expect');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const { v4 } = require('uuid');
const Session = require('../server/infra/database/Session');
const seed = require('./seed');

chai.use(sinonChai);
const { expect } = chai;

describe('Session integration', () => {
  beforeEach(async () => {
    // before all, seed data to DB
    await seed.clear();
    await seed.seed();
  });

  afterEach(async () => {
    await seed.clear();
  });

  it('get normal DB connection', async () => {
    const session = new Session();
    await session.getDB()('wallet').insert({ id: v4(), name: 'testWallet' });
    const result = await session.getDB().select().from('wallet');
    expect(result).lengthOf(4);
  });

  it('Use transaction, and commit', async () => {
    const session = new Session();
    await session.beginTransaction();
    await session.getDB()('wallet').insert({ id: v4(), name: 'testWallet' });
    const result = await session.getDB().select().from('wallet');
    await session.commitTransaction();
    expect(result).lengthOf(4);
  });

  it('Use transaction, rollback', async () => {
    const session = new Session();
    await session.beginTransaction();
    await session.getDB()('wallet').insert({ id: v4(), name: 'testWallet' });
    await session.rollbackTransaction();
    const result = await session.getDB().select().from('wallet');
    expect(result).lengthOf(3);
  });

  it('Use transaction, nest case', async () => {
    const session = new Session();
    await session.beginTransaction();

    await jestExpect(async () => {
      await session.beginTransaction();
    }).rejects.toThrow(/transaction/);
  });
});
