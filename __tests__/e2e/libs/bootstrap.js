const log = require('loglevel');
const data = require('../database/seed.js');

const wallets = [
  data.wallet.id,
  data.walletB.id,
  data.walletC.id,
  data.walletTrustD.id,
  data.walletTrustE.id,
];

exports.mochaHooks = {
  beforeAll: async () => {
    log.debug('Creating test data in DB...');
    await data.clear(wallets);
    await data.seed();
  },
  afterAll: async () => {
    log.debug('Clearing test data from DB!');
    await data.clear(wallets);
  },
};

exports.testData = data;
