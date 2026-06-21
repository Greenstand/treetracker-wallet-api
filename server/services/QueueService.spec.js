const sinon = require('sinon');
const { expect } = require('chai');
const log = require('loglevel');
const knex = require('../infra/database/knex');
const QueueService = require('./QueueService');

describe('QueueService', () => {
  let knexRawStub;
  let logErrorStub;

  beforeEach(() => {
    knexRawStub = sinon.stub(knex, 'raw').resolves();
    logErrorStub = sinon.stub(log, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('sendWalletCreationNotification', () => {
    it('should publish a wallet creation message to the queue', async () => {
      const wallet = {
        id: 1,
        userId: 42,
        createdAt: '2025-04-29T00:00:00Z',
      };

      await QueueService.sendWalletCreationNotification(wallet);

      expect(knexRawStub.calledOnce).to.be.true;
      expect(knexRawStub.firstCall.args[0]).to.equal(
        'INSERT INTO queue.message(channel, data) VALUES (?, ?) RETURNING *',
      );
      expect(knexRawStub.firstCall.args[1][0]).to.equal('wallet_created');
      const payload = JSON.parse(knexRawStub.firstCall.args[1][1]);
      expect(payload).to.deep.equal({
        walletId: 1,
        userId: 42,
        createdAt: '2025-04-29T00:00:00Z',
      });
    });

    it('should not throw error if publish fails', async () => {
      knexRawStub.rejects(new Error('publish failed'));

      const wallet = {
        id: 2,
        userId: 43,
        createdAt: '2025-04-30T00:00:00Z',
      };

      let errorCaught = false;
      try {
        await QueueService.sendWalletCreationNotification(wallet);
      } catch (err) {
        errorCaught = true;
      }

      expect(errorCaught).to.be.false;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(
        'Failed to publish wallet creation message:',
      );
      expect(logErrorStub.firstCall.args[1])
        .to.be.an('error')
        .with.property('message', 'publish failed');
    });
  });
});
