require('dotenv').config();
const {expect} = require('chai');
const chai = require('chai');
const {
    clear,
    registerAndLogin,
    getTransfer, sendTokensTransfer, feedTokens
} = require('../utils/testUtils')
const {del} = require('../utils/sendReq');
const TransferEnums = require('../../server/utils/transfer-enum');
const walletAInfo = require("../mock-data/wallet/walletA.json");
const walletBInfo = require("../mock-data/wallet/walletB.json");
chai.use(require('chai-uuid'));

describe('Create and cancel a pending transfer', () => {
    let walletA;
    let walletB;
    let transfer;
    let tokens = [];

    before(clear);
    afterEach(async () => {
        tokens = [];
        await clear();
    });

    beforeEach(async () => {
        walletA = await registerAndLogin(walletAInfo);
        walletB = await registerAndLogin(walletBInfo);

        tokens = await feedTokens(walletA, 5);
        transfer = await sendTokensTransfer(walletA, walletB, tokens.map(token => token.id), TransferEnums.STATE.pending);
    });

    it('Cancel a pending transfer', async () => {
        const res = await del(`/transfers/${transfer.id}`, walletA);
        expect(res).to.have.property('statusCode', 200);
        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.cancelled);
    })

    it('Cancel a pending transfer by receiver', async () => {
        const res = await del(`/transfers/${transfer.id}`, walletB);
        expect(res).to.have.property('statusCode', 403);
        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.pending);
    })

    it('Cancel a pending transfer, which belong to other account', async () => {
        const walletC = await registerAndLogin({name: 'walletC', password: 'test12'});

        const res = await del(`/transfers/${transfer.id}`, walletC);
        expect(res).to.have.property('statusCode', 403);
        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.pending);
    })
});
