require('dotenv').config();
const {expect} = require('chai');
const {clear, registerAndLogin, createTrustRelation, getTrustRelationship} = require('../utils/testUtils');
const {post} = require('../utils/sendReq');

describe('Accept trust relationship requests', () => {
    let walletA;
    let walletB;
    const relations = ['receive', 'manage', 'send', 'yield'];
    before(async () => {
        await clear();
    });

    beforeEach(async () => {
        walletA = await registerAndLogin({name: 'walletA', password: 'test123'});
        walletB = await registerAndLogin({name: 'walletB', password: 'test123'});
    });

    afterEach(clear);

    it('Accept trust relationship requests', async () => {
        // eslint-disable-next-line no-restricted-syntax
        for (const relation of relations) {
            const request = await createTrustRelation(walletA, walletA, walletB, relation, 'requested');

            // {baseUrl}}/trust_relationships/:trust_relationship_id/accept
            const res = await post(`/trust_relationships/${request.id}/accept`, walletB);

            expect(res).property('statusCode').to.eq(200);
            expect(res.body.id).to.eq(request.id);
            expect(res.body.actor_wallet_id).to.eq(walletA.id);
            expect(res.body.target_wallet_id).to.eq(walletB.id);
            expect(res.body.request_type).to.eq(relation);
            expect(res.body.state).to.eq('trusted');

            // create an empty wallet for next loop test
            walletA = await registerAndLogin({name: Date.now().toString(), password: 'test123'})
            walletB = await registerAndLogin({name: Date.now().toString(), password: 'test123'})
        }
    })

    it('Accept trust relationship requests, but the requests belong to other wallets', async () => {
        const walletC = await registerAndLogin({name: 'walletC', password: 'test1243'});
        // eslint-disable-next-line no-restricted-syntax
        for (const relation of relations) {
            const request = await createTrustRelation(walletA,walletA, walletB, relation, 'requested');
            const res = await post(`/trust_relationships/${request.id}/accept`, walletC);

            expect(res).property('statusCode').to.eq(403);

            const updatedRequest = await getTrustRelationship(request);
            expect(updatedRequest.id).to.eq(request.id);
            expect(updatedRequest.state).to.eq('requested');

            // create an empty wallet for next loop test
            walletA = await registerAndLogin({name: Date.now().toString(), password: 'test123'})
            walletB = await registerAndLogin({name: Date.now().toString(), password: 'test123'})
        }
    })


    it('Accept trust relationship requests, but the request has been accepted', async () => {
        // eslint-disable-next-line no-restricted-syntax
        for (const relation of relations) {
            const request = await createTrustRelation(walletA,walletA, walletB, relation, 'trusted');
            const res = await post(`/trust_relationships/${request.id}/accept`, walletB);

            expect(res).property('statusCode').to.eq(200);
            expect(res.body.id).to.eq(request.id);
            expect(res.body.actor_wallet_id).to.eq(walletA.id);
            expect(res.body.target_wallet_id).to.eq(walletB.id);
            expect(res.body.request_type).to.eq(relation);
            expect(res.body.state).to.eq('trusted');

            // create an empty wallet for next loop test
            walletA = await registerAndLogin({name: Date.now().toString(), password: 'test123'})
            walletB = await registerAndLogin({name: Date.now().toString(), password: 'test123'})
        }
    })

    it('Accept trust relationship requests, but the ID is invalid', async () => {
        const res = await post(`/trust_relationships/f4b20216-6d8e-44f1-9b96-1f9e42a9b4d5/accept`, walletB);
        expect(res).property('statusCode').to.eq(403);
    })
})