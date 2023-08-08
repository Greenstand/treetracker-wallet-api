require('dotenv').config();
const {expect} = require('chai');
const chai = require('chai');
const TransferEnums = require('../../server/utils/transfer-enum');
chai.use(require('chai-uuid'));
const {post} = require('../utils/sendReq');
const {
    clear, registerAndLogin, sendBundleTransfer,
    completePending, getTransfer, getToken
    , cancelPending, deleteToken, feedTokens
} = require('../utils/testUtils');
const walletAInfo = require('../mock-data/wallet/walletA.json');
const walletBInfo = require('../mock-data/wallet/walletB.json');

describe('Create and accept a bundle transfer', () => {
    let walletA;
    let walletB;
    let transfer;
    let tokens = [];

    before(async () => {
        await clear();
    });

    beforeEach(async () => {
        walletA = await registerAndLogin(walletAInfo);
        walletB = await registerAndLogin(walletBInfo);

        tokens = await feedTokens(walletA, 5);
        transfer = await sendBundleTransfer(walletA, walletB, TransferEnums.STATE.pending, 5);
    });

    afterEach(async () => {
        await clear();
        tokens = [];
    })

    it('Accept the pending bundle transfer', async () => {
        const res = await post(`/transfers/${transfer.id}/accept`, walletB)
        expect(res).to.have.property('statusCode', 200);
        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.completed);
        const walletBToken = await getToken(walletB);
        expect(walletBToken.length).to.eq(5);
        const walletAToken = await getToken(walletA);
        expect(walletAToken.length).to.eq(0);
    });

    it('Accept the transfer which already canceled', async () => {
        await cancelPending(transfer);
        const res = await post(`/transfers/${transfer.id}/accept`, walletB)
        expect(res).to.have.property('statusCode', 403);
        const walletBToken = await getToken(walletB);
        expect(walletBToken.length).to.eq(0);
        const walletAToken = await getToken(walletA);
        expect(walletAToken.length).to.eq(5);
    })

    it('Accept the transfer which already accepted', async () => {
        await completePending(transfer);

        const res = await post(`/transfers/${transfer.id}/accept`, walletB)
        expect(res).to.have.property('statusCode', 403);
        const walletBToken = await getToken(walletB);
        expect(walletBToken.length).to.eq(0);
        const walletAToken = await getToken(walletA);
        expect(walletAToken.length).to.eq(5);
    })

    it('Accept the transfer, but sender wallet does NOT have enough tokens', async () => {
        await deleteToken(tokens[0]);

        const res = await post(`/transfers/${transfer.id}/accept`, walletB)
        expect(res).to.have.property('statusCode', 403);
        const walletBToken = await getToken(walletB);
        expect(walletBToken.length).to.eq(0);
        const walletAToken = await getToken(walletA);
        expect(walletAToken.length).to.eq(4);
    })
});
