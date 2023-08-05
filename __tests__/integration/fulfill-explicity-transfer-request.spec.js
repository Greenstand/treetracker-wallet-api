require('dotenv').config();
const {expect} = require('chai');
const {post} = require('../utils/sendReq');
const {
    clear, registerAndLogin, sendTokensTransfer,
    getToken, deleteToken, getTransfer, feedTokens
} = require('../utils/testUtils');
const TransferEnums = require('../../server/utils/transfer-enum');

describe('Request and fulfill an explicit transfer', () => {
    let walletA;
    let walletB;
    let transfer;
    let tokens = []

    before(async () => {
        await clear();
    });

    beforeEach(async () => {
        walletA = await registerAndLogin({name: 'walletA', password: 'abc13'});
        walletB = await registerAndLogin({name: 'walletB', password: 'abc12'});

        tokens = await feedTokens(walletA, 5);
        transfer = await sendTokensTransfer(walletA, walletB, tokens.map(token => token.id), TransferEnums.STATE.requested) // I request 5 tokens before test
    });

    afterEach(async () => {
        await clear();
        tokens = [];
    })

    it('Fulfill a requested transfer', async () => {
        const res = await post(`/transfers/${transfer.id}/fulfill`, walletA, null, {implicit: true})
        expect(res).property('statusCode').to.eq(200);
        expect(res.body.state).to.eq(TransferEnums.STATE.completed);

        const walletBTokens = await getToken(walletB);
        const walletATokens = await getToken(walletA);
        expect(walletBTokens.length).to.eq(tokens.length);
        expect(walletATokens.length).to.eq(0);
    })

    it('Fulfill a requested transfer, but sender wallet dont have enough tokens', async () => {
        // delete one token from walletA, so that walletA do not have enough tokens to fulfill
        const result = await deleteToken(tokens[0]); // delete one token form db
        expect(result).to.eq(1);
        tokens = await getToken(walletA); // now tokens array just have 4

        const res = await post(`/transfers/${transfer.id}/fulfill`, walletA, null, {implicit: true})
        expect(res).property('statusCode').to.eq(200); // success

        const walletBTokens = await getToken(walletB);
        const walletATokens = await getToken(walletA);
        expect(walletATokens.length).to.eq(0);
        expect(walletBTokens.length).to.eq(4); // I only 4 tokens successfully, although I actually requested 5 tokens

        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.completed);
    })

    it('Fulfill a requested transfer, but the transfer belong to other account', async () => {
        const walletC = await registerAndLogin({name: 'walletC', password: 'test123'});

        const res = await post(`/transfers/${transfer.id}/fulfill`, walletC, null, {implicit: true})
        expect(res).property('statusCode').to.eq(403);

        const walletBTokens = await getToken(walletB);
        const walletATokens = await getToken(walletA);
        expect(walletATokens.length).to.eq(tokens.length);
        expect(walletBTokens.length).to.eq(0);

        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.requested);
    })
});
