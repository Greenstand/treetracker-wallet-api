const log = require('loglevel');

exports.connectionString = process.env.DATABASE_URL;

if (!process.env.DATABASE_URL) {
  log.warn('no database URL set from environment!');
}

exports.sentryDSN = '';

exports.map_url = 'http://test.treetracker.org/';
exports.wallet_url = 'http://test.treetracker.org/';
