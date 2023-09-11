require('dotenv').config();
const {expect} = require('chai');
const chai = require('chai');
const TransferEnums = require('../../server/utils/transfer-enum');
chai.use(require('chai-uuid'));
const {registerAndLogin, clear, sendBundleTransfer, getTransfer} = require('../utils/testUtils');
const walletAInfo = require('../mock-data/wallet/walletA.json');
const walletBInfo = require('../mock-data/wallet/walletB.json');
const {del} = require('../utils/sendReq');

describe('Cancel pending transfer', () => {
    let walletA;
    let walletB;
    let transfer;
    before(async () => {
        await clear();
    })

    beforeEach(async () => {
        walletA = await registerAndLogin(walletAInfo);
        walletB = await registerAndLogin(walletBInfo);
    })

    afterEach(async () => {
        await clear();
    })

    it('Cancel the pending transfer by sender', async () => {
        transfer = await sendBundleTransfer(walletA, walletB, TransferEnums.STATE.pending, 1);

        const res = await del(`/transfers/${transfer.id}`, walletA);
        expect(res).to.have.property('statusCode', 200);
        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.cancelled);
    });

    it('Cancel the pending transfer by receiver', async () => {
        transfer = await sendBundleTransfer(walletA, walletB, TransferEnums.STATE.pending, 1);

        const res = await del(`/transfers/${transfer.id}`, walletB);
        expect(res).to.have.property('statusCode', 403);

        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.pending);
    });

    it('Cancel the pending transfer which already canceled', async () => {
        transfer = await sendBundleTransfer(walletA, walletB, TransferEnums.STATE.cancelled, 1);

        const res = await del(`/transfers/${transfer.id}`, walletA)
        expect(res).to.have.property('statusCode', 409);
    })

    it('Cancel the pending transfer which is belong to other wallet', async () => {
        transfer = await sendBundleTransfer(walletA, walletB, TransferEnums.STATE.pending, 1);

        const walletC = await registerAndLogin({name: 'walletCCC', password: 'test1234'});
        const res = await del(`/transfers/${transfer.id}`, walletC)
        expect(res).to.have.property('statusCode', 403);
    })
});
