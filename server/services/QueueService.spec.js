const sinon = require('sinon');
const { expect } = require('chai');
const log = require('loglevel');

const queue = require('treetracker-wallet-app/packages/queue');

describe('QueueService', () => {
  let publishStub;
  let logErrorStub;

  beforeEach(() => {
    publishStub = sinon.stub(queue, 'publish');
    logErrorStub = sinon.stub(log, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  const queueService = require('./QueueService');
  const knex = require('../infra/database/knex');

  describe('sendWalletCreationNotification', () => {
    it('should publish a wallet creation message to the queue', async () => {
      const wallet = {
        id: 1,
        userId: 42,
        createdAt: '2025-04-29T00:00:00Z',
      };

      await queueService.sendWalletCreationNotification(wallet);

      expect(publishStub.calledOnce).to.be.true;
      expect(publishStub.firstCall.args[0]).to.deep.equal({
        pgClient: knex,
        channel: 'wallet_created',
        data: {
          walletId: 1,
          userId: 42,
          createdAt: '2025-04-29T00:00:00Z',
        },
      });
    });

    it('should not throw error if publish fails', () => {
      publishStub.throws(new Error('publish failed'));

      const wallet = {
        id: 2,
        userId: 43,
        createdAt: '2025-04-30T00:00:00Z',
      };

      let errorCaught = false;
      try {
        queueService.sendWalletCreationNotification(wallet);
      } catch (err) {
        errorCaught = true;
      }

      expect(errorCaught).to.be.false;
      expect(publishStub.calledOnce).to.be.true;
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
