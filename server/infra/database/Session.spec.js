const jestExpect = require('expect');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const knex = require('./knex');
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

  describe('commitTransaction', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('resolves when COMMIT succeeded', async () => {
      const trx = {
        commit: sinon.stub().resolves(),
        executionPromise: Promise.resolve(),
      };
      sinon.stub(knex, 'transaction').resolves(trx);

      await session.beginTransaction();
      await session.commitTransaction();

      expect(trx.commit).calledOnce;
      expect(session.isTransactionInProgress()).false;
    });

    it('rejects when COMMIT itself failed, with no transaction left in progress', async () => {
      // knex 0.21: commit() resolves even when COMMIT fails; only
      // executionPromise rejects, e.g. a serialization failure (40001) that
      // Postgres detects at commit time.
      const commitError = new Error('could not serialize access');
      commitError.code = '40001';
      const executionPromise = Promise.reject(commitError);
      executionPromise.catch(() => {}); // it is awaited below, not here
      const trx = {
        commit: sinon.stub().resolves(),
        rollback: sinon.stub().resolves(),
        executionPromise,
      };
      sinon.stub(knex, 'transaction').resolves(trx);

      await session.beginTransaction();
      expect(session.isTransactionInProgress()).true;

      let error;
      try {
        await session.commitTransaction();
      } catch (e) {
        error = e;
      }

      expect(error).eq(commitError);
      expect(trx.commit).calledOnce;
      expect(trx.rollback).not.called;
      expect(session.isTransactionInProgress()).false;
    });
  });
});
