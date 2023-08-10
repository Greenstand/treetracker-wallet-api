require('dotenv').config();
const {expect} = require('chai');
const chai = require('chai');
const {
    clear,
    registerAndLogin,
    createTrustRelation, getTrustRelationship, updateTrustRelation
} = require('../utils/testUtils')
chai.use(require('chai-uuid'));
const { post} = require('../utils/sendReq');
const {send, manage} = require('../../server/utils/trust-enums').ENTITY_TRUST_REQUEST_TYPE;
const {requested, trusted, canceled_by_target, cancelled_by_originator} = require('../../server/utils/trust-enums').ENTITY_TRUST_STATE_TYPE;


describe('Decline the trust relationship', () => {
    let walletA;
    let walletB;
    let walletC;
    let relationship;

    before(async () => {
        await clear();
    });

    beforeEach(async () => {
        walletA = await registerAndLogin({name: 'walletA', password: 'test123'});
        walletB = await registerAndLogin({name: 'walletB', password: 'test123'});
        walletC = await registerAndLogin({name: 'walletC', password: 'test123'});

        // walletC 'trusted manage' walletB, wallet A 'requested send' wallet B
        await createTrustRelation(walletC, walletC, walletB, manage, trusted);
        relationship = await createTrustRelation(walletA, walletA, walletB, send, requested);
    });

    afterEach(clear);

    it(`Decline the trust relationship by target wallet`, async () => {
        const res = await post(`/trust_relationships/${relationship.id}/decline`, walletB);
        expect(res).property('statusCode').to.eq(200);
        expect(res.body.state).to.eq(canceled_by_target);

        const updatedRelationship = await getTrustRelationship(relationship);
        expect(updatedRelationship.state).to.eq(canceled_by_target);
    });

    it('Decline the trust relationship by the wallet which manage the target wallet', async () => {
        const res = await post(`/trust_relationships/${relationship.id}/decline`, walletC);
        expect(res).property('statusCode').to.eq(200);
        expect(res.body.state).to.eq(canceled_by_target);

        const updatedRelationship = await getTrustRelationship(relationship);
        expect(updatedRelationship.state).to.eq(canceled_by_target);
    });

    // the state success to updated, although the relationship already canceled/declined before this request
    it('Decline the trust relationship which has already canceled/declined', async () => {
        await updateTrustRelation(relationship, {state: cancelled_by_originator})
        const res = await post(`/trust_relationships/${relationship.id}/decline`, walletB);

        expect(res).property('statusCode').to.eq(200);
        expect(res.body.state).to.eq(canceled_by_target);

        const updatedRelationship = await getTrustRelationship(relationship);
        expect(updatedRelationship.state).to.eq(canceled_by_target);
    });

    it('Decline the trust relationship, but the state is "trusted"', async () => {
        await updateTrustRelation(relationship, {state: trusted});
        const res = await post(`/trust_relationships/${relationship.id}/decline`, walletB);

        expect(res).property('statusCode').to.eq(200);
        expect(res.body.state).to.eq(canceled_by_target);

        const updatedRelationship = await getTrustRelationship(relationship);
        expect(updatedRelationship.state).to.eq(canceled_by_target);
    })
});
