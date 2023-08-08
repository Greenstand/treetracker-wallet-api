require('dotenv').config();
const {expect} = require('chai');
const {post} = require('../utils/sendReq');
const {
    clear, registerAndLogin,
    getRandomToken, sendBundleTransfer,
    getToken, deleteToken, getTransfer, feedTokens
} = require('../utils/testUtils');
const TransferEnums = require('../../server/utils/transfer-enum');

describe('Request and fulfill a bundle transfer', () => {
    let walletA;
    let walletB
    let tokens = [];
    let transfer;

    before(async () => {
        await clear()
    });

    afterEach(async () => {
        await clear();
        tokens = [];
    })

    beforeEach(async () => {
        walletA = await registerAndLogin({name: 'walletA', password: 'abc13'});
        walletB = await registerAndLogin({name: 'walletB', password: 'abc12'});

        tokens = await feedTokens(walletA, 5);
        transfer = await sendBundleTransfer(walletA, walletB, TransferEnums.STATE.requested, 5);
    });

    it('Fulfill a requested transfer', async () => {
        const res = await post(`/transfers/${transfer.id}/fulfill`, walletA, null, {tokens: tokens.map(token => token.id)})
        expect(res).property('statusCode').to.eq(200);
        expect(res.body.state).to.eq(TransferEnums.STATE.completed);

        const walletBTokens = await getToken(walletB);
        const walletATokens = await getToken(walletA);
        expect(walletBTokens.length).to.eq(tokens.length);
        expect(walletATokens.length).to.eq(0);
    })

    it('Fulfill a requested transfer, but sender wallet dont have enough tokens', async () => {
        // delete one token from walletA, so that walletA do not have enough tokens to fulfill
        const result = await deleteToken(tokens[0]);
        expect(result).to.eq(1);
        tokens = await getToken(walletA);

        const res = await post(`/transfers/${transfer.id}/fulfill`, walletA, null, {tokens: tokens.map(token => token.id)})
        expect(res).property('statusCode').to.eq(403);

        const walletBTokens = await getToken(walletB);
        const walletATokens = await getToken(walletA);
        expect(walletATokens.length).to.eq(tokens.length);
        expect(walletBTokens.length).to.eq(0);

        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.requested);
    })

    it('Fulfill a requested transfer, but there is one token do not exist', async () => {
        tokens[0] = getRandomToken();
        const res = await post(`/transfers/${transfer.id}/fulfill`, walletA, null, {tokens: tokens.map(token => token.id)})
        expect(res).property('statusCode').to.eq(404);

        const walletBTokens = await getToken(walletB);
        const walletATokens = await getToken(walletA);
        expect(walletATokens.length).to.eq(tokens.length);
        expect(walletBTokens.length).to.eq(0);

        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.requested);
    })

    it('Fulfill a requested transfer, but the transfer belong to other account', async () => {
        const walletC = await registerAndLogin({name: 'walletC', password: 'test123'});

        const res = await post(`/transfers/${transfer.id}/fulfill`, walletC, null, {tokens: tokens.map(token => token.id)});
        expect(res).property('statusCode').to.eq(403);

        const walletBTokens = await getToken(walletB);
        const walletATokens = await getToken(walletA);
        expect(walletATokens.length).to.eq(tokens.length);
        expect(walletBTokens.length).to.eq(0);

        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.requested);
    })
});
