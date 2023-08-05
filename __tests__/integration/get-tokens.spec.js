/*
 * The integration test to test the whole business, with DB
 */
require('dotenv').config();
const {expect} = require('chai');
const {registerAndLogin, getRandomToken, clear, feedTokens} = require('../utils/testUtils');
const {get} = require('../utils/sendReq')
const walletAInfo = require('../mock-data/wallet/walletA.json');
const walletBInfo = require('../mock-data/wallet/walletB.json');

describe('GET tokens', () => {
    let walletA;
    let walletB;
    let tokens = [];

    before(clear)

    beforeEach(async () => {
        walletA = await registerAndLogin(walletAInfo);
        walletB = await registerAndLogin(walletBInfo);

        tokens = await feedTokens(walletA, 5);
    });

    afterEach(async () => {
        await clear();
        tokens = [];
    })


    it('Get tokens from a wallet', async () => {
        const res = await get(`/tokens/${tokens[0].id}`, walletA);
        expect(res).to.have.property('statusCode', 200);
        expect(res.body.id).to.eq(tokens[0].id);
    })

    it('Get tokens from a wallet, but the token do not exist', async () => {

        const res = await get(`/tokens/${getRandomToken().id}`, walletA);
        expect(res).to.have.property('statusCode', 404);
    })

    it('Get tokens from a wallet, but the token belong to another wallet', async () => {
        const res = await get(`/tokens/${tokens[0].id}`, walletB);
        expect(res).to.have.property('statusCode', 401);
    })

    it('Get a set of tokens from a wallet', async () => {
        const res = await get('/tokens', walletA, {limit: 10, offset: 0});
        expect(res).to.have.property('statusCode', 200);
        expect(res.body.tokens.length).to.eq(tokens.length);

        const resB = await get('/tokens', walletB, {limit: 10, offset: 0});
        expect(resB).to.have.property('statusCode', 200);
        expect(resB.body.tokens.length).to.eq(0);
    })

    it('Get tokens by paginate', async () => {
        const res = await get(`/tokens`, walletA, {limit: 1, offset: 2});
        expect(res).to.have.property('statusCode', 200);

        expect(res.body.tokens[0].id).to.eq(tokens[2].id);
    })
});
