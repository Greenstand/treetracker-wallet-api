require('dotenv').config();
const {expect} = require('chai');
const chai = require('chai');
const {registerAndLogin, clear} = require('../utils/testUtils');
const walletAInfo = require('../mock-data/wallet/walletA.json');
const {post} = require('../utils/sendReq')
chai.use(require('chai-uuid'));

describe('Wallet: create(POST) wallets of an account', () => {
    let walletA;

    before(async () => {
        await clear();
    })

    beforeEach(async function(){
        walletA = await registerAndLogin(walletAInfo);
    })

    afterEach(async function () {
        await clear();
    })


    it('create wallet by a valid wallet name', async () => {
        const res = await post('/wallets', walletA, undefined, {wallet: 'azAZ.-@0123456789'})
        expect(res).property('statusCode').to.eq(200);
        expect(res.body).contain({wallet: 'azAZ.-@0123456789'})
        expect(res.body.id).to.exist;
    })

    it('create wallet by invalid name length', async () => {
        const res = await post('/wallets', walletA, undefined, {wallet: 'ab'})
        expect(res).property('statusCode').to.eq(422);

        const resB = await post('/wallets', walletA, undefined, {wallet: '2023.7.26CodingAtCanadaNiceToMeetYouuuuuuuuuuuuuuuu'})
        expect(resB).property('statusCode').to.eq(422);
    })

    it('create wallet with invalid characters', async () => {
        const set = "~!#$%^&*()_+=[]\\{}|;':\",/<>?";

        // eslint-disable-next-line no-restricted-syntax
        for (const char of set) {
            const res = await post('/wallets', walletA, undefined, {wallet: `test${char}`})
            expect(res).property('statusCode').to.eq(422);
        }
    })
})