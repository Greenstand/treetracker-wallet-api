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
      const text = `INSERT into queue.message(channel, data) values ($1, $2) RETURNING *`;
      const values = [
        'wallet_created',
        {
          walletId: wallet.id,
          userId: wallet.userId,
          createdAt: wallet.createdAt,
        },
      ];

      const res = await knex.raw(text, values);
      log.debug(`postgres message dispatch success: ${JSON.stringify(res.rows)}`);
      log.debug(
        `Wallet creation notification sent for wallet ID: ${wallet.id}`,
      );
    } catch (err) {
      log.error('Failed to publish wallet creation message:', err);
    }
  }
}

module.exports = QueueService;
