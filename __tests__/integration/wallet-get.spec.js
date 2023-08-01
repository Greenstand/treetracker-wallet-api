require('dotenv').config();
const {expect} = require('chai');
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('chai-uuid'));
const {registerAndLogin, clear, feedSubWallets} = require('../utils/testUtils');
const {get} = require('../utils/sendReq')
const walletAInfo = require('../mock-data/wallet/walletA.json');
const walletBInfo = require('../mock-data/wallet/walletB.json');
const wallets = require('../mock-data/wallet/wallets.json');


describe('Wallet: Get wallets of an account', () => {
    let walletA;
    let walletB;

    before(async () => {
        await clear();
    })

    beforeEach(async () => {
        walletA = await registerAndLogin(walletAInfo);
        // what registerAndLogin returned?
        // walletA = {
        //                  name: <string>,
        //                  password: <string>,
        //                  salt: <string>,
        //                  logo_url: null,
        //                  created_at: <time>,
        //                  apiKey: <string>,
        //                  token: <string> (the bearer token)
        //                 }
        walletB = await registerAndLogin(walletBInfo);
        await feedSubWallets(walletA.id, wallets);
    });

    afterEach(async () => {
        sinon.restore();
        await clear();
    })

    it('Get wallets of WalletA without params', async () => {
        const res = await get('/wallets', walletA)

        expect(res).property('statusCode').to.eq(200);
        expect(res.body.total).to.eq(11);

        const resB = await get('/wallets', walletB)

        expect(resB).property('statusCode').to.eq(200);
        expect(resB.body.total).to.eq(1);
    });

    it('Get wallet by wallet name, success', async () => {
        const res = await get('/wallets', walletB, {name: 'walletB'})
        expect(res).property('statusCode').to.eq(200);
        expect(res.body.total).to.eq(1);
    })

    it('Get wallet which is managed by other account', async () => {
        const res = await get('/wallets', walletB, {name: wallets[0].name})

        expect(res).property('statusCode').to.eq(200);
        expect(res.body.total).to.eq(1);
        expect(res.body.wallets[0].name).to.eq(walletB.name);
    })

    it('Get wallet with offset val', async () => {
        const res = await get('/wallets', walletA, {offset: 0})
        expect(res).property('statusCode').to.eq(200);
        expect(res.body.total).to.eq(11);

        const resB = await get('/wallets', walletA, {limit: 100, offset: 2})
        expect(resB).property('statusCode').to.eq(200);
        expect(resB.body.total).to.eq(9);

        const resC = await get('/wallets', walletA, {limit: 2, offset: 0})
        expect(resC).property('statusCode').to.eq(200);
        expect(resC.body.total).to.eq(2);
    })

    it('Get wallet by valid uuid', async () => {
        const res = await get(`/wallets/${walletA.id}`, walletA)
        expect(res).property('statusCode').to.eq(200);
    })

    it('Get wallet by valid uuid which does not exist', async () => {
        const res = await get(`/wallets/00a6fa25-df29-4701-9077-557932591766`, walletA)
        expect(res).property('statusCode').to.eq(404);
    })
})
