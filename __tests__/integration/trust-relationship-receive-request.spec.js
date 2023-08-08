require('dotenv').config();
const {expect} = require('chai');
const {clear, registerAndLogin, getTrustRelationship, feedSubWallets} = require('../utils/testUtils');
const {post} = require('../utils/sendReq');
const TrustRelationship = require('../../server/utils/trust-enums');

describe('Send trust requests to another wallet', () => {
    let walletA;
    let walletB;
    before(async () => {
        await clear();
    });

    beforeEach(async () => {
        walletA = await registerAndLogin({name: 'walletA', password: 'test123'});
        walletB = await registerAndLogin({name: 'walletB', password: 'test123'});
    });

    afterEach(clear);

    it('send receive trust relationship request', async () => {
        const res = await post('/trust_relationships', walletA, null, {
            trust_request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive,
            requestee_wallet: walletB.name
        });
        expect(res).property('statusCode').to.eq(200);
        expect(res.body.actor_wallet).to.eq(walletA.name);
        expect(res.body.originator_wallet).to.eq(walletA.name);
        expect(res.body.target_wallet).to.eq(walletB.name);
        expect(res.body.request_type).to.eq(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive);
        expect(res.body.state).to.eq('requested');

        const relationship = await getTrustRelationship(res.body);
        expect(res.body.id).to.eq(relationship.id);
    })

    it('send receive trust relationship request, but target wallet do not exist', async () => {
        const res = await post('/trust_relationships', walletA, null, {
            trust_request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive,
            requestee_wallet: 'walletC'
        });
        expect(res).property('statusCode').to.eq(404);
        const relation = await getTrustRelationship({actorId: walletA.id});
        expect(relation).to.eq(undefined);
    })


    it('send receive trust relationship request, but requester is other account', async () => {
        const walletC = await registerAndLogin({name: 'walletC', password: 'test123'});
        const res = await post('/trust_relationships', walletA, null,
            {
                requester_wallet: walletC.name,
                requestee_wallet: walletB.name,
                trust_request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive,
            });
        expect(res).property('statusCode').to.eq(403);
        const relationship = await getTrustRelationship({
            originatorId: walletA.id,
            requesterId: walletC.id,
            requesteeId: walletB.id
        });
        expect(relationship).to.eq(undefined);
    })

    it('send receive trust relationship request, but originator is its managed wallet', async () => {
        const walletC = {name: 'walletC'}
        await feedSubWallets(walletA, [walletC]);

        const res = await post('/trust_relationships', walletA, null,
            {
                requester_wallet: walletC.name,
                requestee_wallet: walletB.name,
                trust_request_type: TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive,
            });

        expect(res).property('statusCode').to.eq(200);
        expect(res.body.actor_wallet).to.eq(walletC.name);
        expect(res.body.originator_wallet).to.eq(walletA.name);
        expect(res.body.target_wallet).to.eq(walletB.name);
        expect(res.body.request_type).to.eq(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive);
        expect(res.body.state).to.eq('requested');

        const relationship = await getTrustRelationship(res.body);
        expect(res.body.id).to.eq(relationship.id);
    })
});
