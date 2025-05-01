const sinon = require('sinon');
const { expect } = require('chai');

const queue = require('treetracker-wallet-app/packages/queue');

describe('publishWalletToQueue', () => {
  let publishStub;
  //   let consoleErrorStub;

  beforeEach(() => {
    publishStub = sinon.stub(queue, 'publish').returns();
    // consoleErrorStub = sinon.stub(console, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  const publishWalletToQueue = require('./publishWalletToQueue');
  const knex = require('../infra/database/knex');

  it('should publish a wallet creation message to the queue', async () => {
    const wallet = {
      id: 1,
      userId: 42,
      createdAt: '2025-04-29T00:00:00Z',
    };

    await publishWalletToQueue(wallet);

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

  it('should not throw error if publish fails', async () => {});
});
