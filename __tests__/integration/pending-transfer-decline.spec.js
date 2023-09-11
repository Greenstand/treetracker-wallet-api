require('dotenv').config();
const {expect} = require('chai');
const chai = require('chai');
const TransferEnums = require('../../server/utils/transfer-enum');
const {
    clear, registerAndLogin, getTransfer,
    sendTokensTransfer, feedTokens, cancelPending
} = require("../utils/testUtils");
const {post} = require('../utils/sendReq');
const walletAInfo = require("../mock-data/wallet/walletA.json");
const walletBInfo = require("../mock-data/wallet/walletB.json");
chai.use(require('chai-uuid'));

describe('Create and decline a pending transfer', () => {
    let walletA;
    let walletB;
    let transfer;
    let tokens = [];

    before(async () => {
        await clear();
    });
    afterEach(async () => {
        tokens = [];
        await clear();
    });

    beforeEach(async () => {
        await clear();
        walletA = await registerAndLogin(walletAInfo);
        walletB = await registerAndLogin(walletBInfo);

        tokens = await feedTokens(walletA, 5);
        transfer = await sendTokensTransfer(walletA, walletB, TransferEnums.STATE.pending, tokens.map(token => token.id));
    });

    it('Decline a pending transfer', async () => {
        const res = await post(`/transfers/${transfer.id}/decline`, walletB);
        expect(res).to.have.property('statusCode', 200);

        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.cancelled);
    });

    it('Decline a pending transfer which already declined/canceled', async () => {
        await cancelPending(transfer);

        const res = await post(`/transfers/${transfer.id}/decline`, walletB);
        expect(res).to.have.property('statusCode', 409);

        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.cancelled);
    })

    it('Decline a pending transfer which is belong to others', async () => {
        const walletC = await registerAndLogin({name: 'fdgjsgfhsa', password: 'fhdjsgfhjds12'});
        const res = await post(`/transfers/${transfer.id}/decline`, walletC);
        expect(res).to.have.property('statusCode', 403);

        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.pending);
    })
});
