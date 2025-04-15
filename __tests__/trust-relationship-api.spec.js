require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const TrustRelationship = require('../server/utils/trust-enums');
chai.use(require('chai-uuid'));

describe('Trust relationship management', () => {
  let bearerToken;
  let bearerTokenB;
  let trustRelationshipId;

  before(async () => {
    await seed.clear();
    await seed.seed();

    bearerToken = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;
  });

  it('Creates send relationship', async () => {
    const res = await request(server)
      .post('/trust_relationships')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        trust_request_type: 'send',
        requestee_wallet: seed.walletC.name,
      });
    expect(res).property('statusCode').to.eq(201);
  });

  it('GET /trust_relationships', async () => {
    const res = await request(server)
      .get('/trust_relationships')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).property('statusCode').to.eq(200); // Integration
    expect(res).property('body').property('trust_relationships').lengthOf(1); // Integration
    expect(res.body.trust_relationships[0]).property('id').to.be.a.uuid('v4'); // Unit test, or use Joi to evaluate entire payload
  });

  it('POST /trust_relationships with wrong request type', async () => {
    const res = await request(server)
      .post('/trust_relationships')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        trust_request_type: 'wrongtype',
        wallet: 'any',
      });
    expect(res).property('statusCode').to.eq(422);
  });

  it('POST /trust_relationships', async () => {
    const res = await request(server)
      .post('/trust_relationships')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        trust_request_type: 'send',
        requestee_wallet: seed.walletB.name,
      });
    expect(res).property('statusCode').to.eq(201);
  });

  it('GET /trust_relationships with search parameter', async () => {
    const searchRes = await request(server)
      .get('/trust_relationships')
      .set('Authorization', `Bearer ${bearerToken}`)
      .query({ search: seed.walletB.name });

    expect(searchRes).property('statusCode').to.eq(200);
    expect(searchRes.body).to.have.property('trust_relationships');
    expect(searchRes.body.trust_relationships).to.be.an('array').that.is.not
      .empty;

    expect(searchRes.body.trust_relationships[0])
      .property('target_wallet')
      .to.eq(seed.walletB.name);
  });

  it(`${seed.walletB.name} try to request "manage" relationship to ${seed.wallet.name}`, async () => {
    await seed.clear();
    await seed.seed();
    const res = await request(server)
      .post('/trust_relationships')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({
        trust_request_type: 'manage',
        requestee_wallet: seed.wallet.name,
      });
    expect(res).property('statusCode').to.eq(201);
    const trustRelationship = res.body;
    expect(trustRelationship).property('id').to.be.a.uuid('v4');
    expect(trustRelationship)
      .property('state')
      .eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested);
    trustRelationshipId = trustRelationship.id;
  });

  it(`${seed.wallet.name} accept this request`, async () => {
    const res = await request(server)
      .post(`/trust_relationships/${trustRelationshipId}/accept`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res).property('statusCode').to.eq(200);
    expect(res.body).property('state').eq('trusted');
    expect(res.body).property('type').eq('manage');
    expect(res.body).property('actor_wallet').eq(seed.walletB.name);
    expect(res.body).property('target_wallet').eq(seed.wallet.name);
  });

  it(`${seed.walletB.name} try to request "yield" relationship to ${seed.wallet.name}`, async () => {
    await seed.clear();
    await seed.seed();
    const res = await request(server)
      .post('/trust_relationships')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({
        trust_request_type: 'yield',
        requestee_wallet: seed.wallet.name,
      });
    expect(res).property('statusCode').to.eq(201);
    const trustRelationship = res.body;
    expect(trustRelationship).property('id').to.be.a.uuid('v4');
    expect(trustRelationship)
      .property('state')
      .eq(TrustRelationship.ENTITY_TRUST_STATE_TYPE.requested);
    trustRelationshipId = trustRelationship.id;
  });

  it(`${seed.wallet.name} accept yield request`, async () => {
    const res = await request(server)
      .post(`/trust_relationships/${trustRelationshipId}/accept`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).property('statusCode').to.eq(200);
    expect(res.body).property('state').eq('trusted');
    expect(res.body).property('type').eq('manage');
    expect(res.body).property('actor_wallet').eq(seed.walletB.name);
    expect(res.body).property('target_wallet').eq(seed.wallet.name);
  });
});
