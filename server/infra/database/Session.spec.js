const jestExpect = require('expect');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const Session = require('./Session');

chai.use(sinonChai);
const { expect } = chai;

describe('Session', () => {
  let session = new Session();

  beforeEach(() => {
    session = new Session();
  });

  it('getDB', () => {
    const db = session.getDB();
    expect(db).not.undefined;
  });

  it('try to commit transaction before begin it, should throw error', async () => {
    await jestExpect(async () => {
      await session.commitTransaction();
    }).rejects.toThrow(/can not commit/i);
  });

  it('try to rollback transaction before begin it, should throw error', async () => {
    await jestExpect(async () => {
      await session.rollbackTransaction();
    }).rejects.toThrow(/can not rollback/i);
  });
});
