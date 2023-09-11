require('dotenv').config();
const {expect} = require('chai');
const chai = require('chai');
const {clear, registerAndLogin, createTrustRelation, getTrustRelationship, updateTrustRelation} = require('../utils/testUtils')
chai.use(require('chai-uuid'));
const {del} = require('../utils/sendReq');
const {send, manage} = require('../../server/utils/trust-enums').ENTITY_TRUST_REQUEST_TYPE;
const {requested, trusted,cancelled_by_originator} = require('../../server/utils/trust-enums').ENTITY_TRUST_STATE_TYPE;

describe('Cancel the requested trust relationship', () => {
    let walletA;
    let walletB;
    let walletC;

    let relationship;

    before(async () => {
        await clear();
    });

    beforeEach(async () => {
        // wallet A 'manage' walletB
        // wallet B request to 'send' walletC
        walletA = await registerAndLogin({name: 'waleltA', password: 'test123'});
        walletB = await registerAndLogin({name: 'waleltB', password: 'test123'});
        walletC = await registerAndLogin({name: 'walletC', password: 'test134'})

        await createTrustRelation(walletA, walletA, walletB, manage, trusted);
        relationship = await createTrustRelation(walletA, walletB, walletC, send, requested);
    });

    afterEach(clear);

    it(`Cancel the trust relationship by originator wallet`, async () => {
        const res = await del(`/trust_relationships/${relationship.id}`, walletA);
        expect(res).property('statusCode').to.eq(200);
        expect(res.body.state).to.eq(cancelled_by_originator);

        const updatedRelationship = await getTrustRelationship(relationship);
        expect(updatedRelationship.state).to.eq(cancelled_by_originator);
    });

    it(`Cancel the trust relationship by actor wallet`, async () => {
        // originator => walletA
        // actor => walletB
        // target => walletC

        // walletA 'trusted manage' walletB
        // walletB 'requested send' walletC
        const res = await del(`/trust_relationships/${relationship.id}`, walletB);
        expect(res).property('statusCode').to.eq(403); // msg: Have no permission to cancel this relationship

        const updatedRelationship = await getTrustRelationship(relationship);
        expect(updatedRelationship.state).to.eq(requested); // the state is still 'requested'
    });

    // same response with 1st 'it' bracket
    it(`Cancel the trust relationship, but it has already be canceled`, async () => {
        await updateTrustRelation(relationship, {state: cancelled_by_originator})

        const res = await del(`/trust_relationships/${relationship.id}`, walletA);
        expect(res).property('statusCode').to.eq(200);
        expect(res.body.state).to.eq(cancelled_by_originator);

        const updatedRelationship = await getTrustRelationship(relationship);
        expect(updatedRelationship.state).to.eq(cancelled_by_originator);
    });

    it(`Cancel the trust relationship, but the state is "trusted"`, async () => {
        const res = await del(`/trust_relationships/${relationship.id}`, walletA);
        expect(res).property('statusCode').to.eq(200);
        expect(res.body.state).to.eq(cancelled_by_originator);

        const updatedRelationship = await getTrustRelationship(relationship);
        expect(updatedRelationship.state).to.eq(cancelled_by_originator);

    });

    it('Cancel the trust relationship, but it belongs to other account', async () => {
        const walletD = await registerAndLogin({name: 'walletD', password: 'test123'});

        const res = await del(`/trust_relationships/${relationship.id}`, walletD);
        expect(res).property('statusCode').to.eq(403);

        const updatedRelationship = await getTrustRelationship(relationship);
        expect(updatedRelationship.state).to.eq(requested);
    })

    it('Cancel the trust relationship by target wallet', async ()=> {
        const res = await del(`/trust_relationships/${relationship.id}`, walletC);
        expect(res).property('statusCode').to.eq(403);

        const updatedRelationship = await getTrustRelationship(relationship);
        expect(updatedRelationship.state).to.eq(requested);
    })
});
