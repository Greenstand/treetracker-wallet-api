const log = require('loglevel');
const knex = require('../infra/database/knex');

class QueueService {
  /**
   * Publishes a wallet creation event to the queue.
   * @param {Object} wallet - The wallet object that was just created.
   * @returns {Promise<void>}
   */
  static async sendWalletCreationNotification(wallet) {
    try {
      const data = JSON.stringify({
        walletId: wallet.id,
        userId: wallet.userId,
        createdAt: wallet.createdAt,
      });

      await knex.raw(
        'INSERT INTO queue.message(channel, data) VALUES (?, ?) RETURNING *',
        ['wallet_created', data],
      );
      log.debug(
        `Wallet creation notification sent for wallet ID: ${wallet.id}`,
      );
    } catch (err) {
      log.error('Failed to publish wallet creation message:', err);
    }
  }
}

module.exports = QueueService;
