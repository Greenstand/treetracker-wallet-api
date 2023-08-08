require('dotenv').config();
const {expect} = require('chai');
const chai = require('chai');
const TransferEnums = require('../../server/utils/transfer-enum');
const {clear, registerAndLogin,
        sendTokensTransfer, getTransfer, getToken,
        completePending, feedTokens
} = require("../utils/testUtils");
const {post} = require("../utils/sendReq");
const walletAInfo = require('../mock-data/wallet/walletA.json');
const walletBInfo = require('../mock-data/wallet/walletB.json');
chai.use(require('chai-uuid'));

describe('Create and accept a pending transfer', () => {
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
        walletA = await registerAndLogin(walletAInfo);
        walletB = await registerAndLogin(walletBInfo);

        tokens = await feedTokens(walletA, 5);
        transfer = await sendTokensTransfer(walletA, walletB, TransferEnums.STATE.pending, tokens.map(token => token.id));
    });

    it('Accept a pending transfer', async () => {
        const res = await post(`/transfers/${transfer.id}/accept`, walletB);
        expect(res).to.have.property('statusCode', 200);
        const updatedTransfer = await getTransfer(transfer);
        expect(updatedTransfer.state).to.eq(TransferEnums.STATE.completed);
        const walletBToken = await getToken(walletB);
        expect(walletBToken.length).to.eq(5);
        const walletAToken = await getToken(walletA);
        expect(walletAToken.length).to.eq(0);
    });

    it('Accept the transfer which already accepted', async () => {
        await completePending(transfer);

        const res = await post(`/transfers/${transfer.id}/accept`, walletB)
        expect(res).to.have.property('statusCode', 403);
        const walletBToken = await getToken(walletB);
        expect(walletBToken.length).to.eq(0);
        const walletAToken = await getToken(walletA);
        expect(walletAToken.length).to.eq(5);
    })

    it('Accept the transfer which is belong to other account', async () => {
        const weiyu = await registerAndLogin({name: 'weiyu', password: 'test1234'});

        const res = await post(`/transfers/${transfer.id}/accept`, weiyu)
        expect(res).to.have.property('statusCode', 403);

        getToken(weiyu).then((result) => {
            expect(result.length).to.eq(0);
        })

        getToken(walletA).then((result) => {
            expect(result.length).to.eq(5);
        })
    })
});
