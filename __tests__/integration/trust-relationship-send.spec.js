require('dotenv').config();
const {expect} = require('chai');
const TransferEnums = require('../../server/utils/transfer-enum');
const {
    clear,
    registerAndLogin,
    createTrustRelation,
    feedTokens,
    getToken, updateTrustRelation
} = require('../utils/testUtils');
const {post} = require("../utils/sendReq");

describe('Send tokens to \'send\' trust relationship', () => {
    let walletA; // walletA 'send' walletB
    let walletB;
    let walletC; // walletC 'receive' walletD
    let walletD;

    let relationshipA;

    before(async () => {
        await clear();
    });

    beforeEach(async () => {
        walletA = await registerAndLogin({name: 'walletA', password: 'test123'});
        walletB = await registerAndLogin({name: 'walletB', password: 'test123'});
        walletC = await registerAndLogin({name: 'walletC', password: 'test123'});
        walletD = await registerAndLogin({name: 'walletD', password: 'test123'});

        // each wallet has one token
        await feedTokens(walletA, 1);
        await feedTokens(walletB, 1);
        await feedTokens(walletC, 1);
        await feedTokens(walletD, 1);
        // walletA 'send' walletB, and walletC 'receive' walletD
        relationshipA = await createTrustRelation(walletA, walletA, walletB, 'send', 'trusted');
        await createTrustRelation(walletC, walletC, walletD, 'receive', 'trusted');
    });

    afterEach(async () => {
        await clear();
    });

    it('send tokens to "send" relationship wallet', async () => {
        let reqBody = {
            sender_wallet: walletA.name,
            receiver_wallet: walletB.name,
            bundle: {
                bundle_size: 1
            },
            claim: false
        }
        const resA = await post('/transfers', walletA, null, reqBody);
        expect(resA).property('statusCode').to.eq(201);
        expect(resA.body.state).to.eq('completed');
        expect((await getToken(walletA)).length).to.eq(0);
        expect((await getToken(walletB)).length).to.eq(2);

        // walletC 'receive' walletD ====> walletD 'send' walletC
        reqBody = {
            sender_wallet: walletD.name,
            receiver_wallet: walletC.name,
            bundle: {
                bundle_size: 1
            },
            claim: false
        }

        const resB = await post('/transfers', walletD, null, reqBody);
        expect(resB).property('statusCode').to.eq(201);
        expect(resB.body.state).to.eq(TransferEnums.STATE.completed);
        expect((await getToken(walletD)).length).to.eq(0);
        expect((await getToken(walletC)).length).to.eq(2);
    })

    it('walletA send tokens to walletE, but the walletE has not accept the "send" trust relationship', async () => {
        const walletE = await registerAndLogin({name: 'walletE', password: 'abcabc1'});
        await createTrustRelation(walletA, walletA, walletE, 'send', 'requested');

        const reqBody = {
            sender_wallet: walletA.name,
            receiver_wallet: walletE.name,
            bundle: {
                bundle_size: 1
            },
            claim: false
        }

        const res = await post('/transfers', walletA, null, reqBody);
        expect(res).property('statusCode').to.eq(202);
        expect(res.body.state).to.eq(TransferEnums.STATE.pending);
        expect((await getToken(walletA)).length).to.eq(1);
        expect((await getToken(walletE)).length).to.eq(0);
    })

    it('send tokens to other wallet, but the trust relationship has canceled', async () => {
        await updateTrustRelation(relationshipA, {state: 'cancelled_by_originator'});

        const reqBody = {
            sender_wallet: walletA.name,
            receiver_wallet: walletB.name,
            bundle: {
                bundle_size: 1
            },
            claim: false
        }

        const res = await post('/transfers', walletA, null, reqBody);
        expect(res).property('statusCode').to.eq(202);
        expect(res.body.state).to.eq(TransferEnums.STATE.pending);
        expect((await getToken(walletA)).length).to.eq(1);
        expect((await getToken(walletB)).length).to.eq(1);
    })
})