const log = require('loglevel');
const queue = require('treetracker-wallet-app/packages/queue');
const knex = require('../infra/database/knex');

class QueueService {
  constructor() {
    this.queue = queue;
    this.knex = knex;
  }

  /**
   * Publishes a wallet creation event to the queue.
   * @param {Object} wallet - The wallet object that was just created.
   * @returns {Promise<void>}
   */
  sendWalletCreationNotification(wallet) {
    try {
      this.queue.publish({
        pgClient: this.knex,
        channel: 'wallet_created',
        data: {
          walletId: wallet.id,
          userId: wallet.userId,
          createdAt: wallet.createdAt,
        },
      });
      log.debug(
        `Wallet creation notification sent for wallet ID: ${wallet.id}`,
      );
    } catch (err) {
      log.error('Failed to publish wallet creation message:', err);
    }
  }
}

module.exports = new QueueService();
