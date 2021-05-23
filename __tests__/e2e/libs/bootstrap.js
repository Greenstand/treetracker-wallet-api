const data = require("../database/seed.js");

const wallets = [data.wallet.id, data.walletB.id, data.walletC.id, data.walletTrustD.id, data.walletTrustE.id];

exports.mochaHooks = {
    beforeAll: async () => {
        console.log('Creating test data in DB...');
        await data.clear(wallets);
        await data.seed();
    },
    afterAll: async () => {
        console.log('Clearing test data from DB!');
        await data.clear(wallets);
    }
};

exports.testData = data;