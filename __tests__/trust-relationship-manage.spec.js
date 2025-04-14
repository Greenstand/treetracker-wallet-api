require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
const TrustRelationship = require('../server/utils/trust-enums');
chai.use(require('chai-uuid'));

describe('Trust relationship: manage', () => {
  let bearerToken;
  let bearerTokenB;

  before(async () => {
    await seed.clear();
    await seed.seed();

    bearerToken = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;
  });

  it(`Should be able to find the trust relationship: manage ${seed.walletC.name}`, async () => {
    const res = await request(server)
      .get('/trust_relationships?limit=1000')
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).property('statusCode').to.eq(200);
    expect(res).property('body').property('trust_relationships').lengthOf(1);
    expect(res.body.trust_relationships[0]).property('id').to.be.a.uuid('v4');
    expect(
      res.body.trust_relationships.some((trust) => {
        return (
          trust.type === TrustRelationship.ENTITY_TRUST_TYPE.manage &&
          trust.target_wallet === seed.walletC.name
        );
      }),
    ).eq(true);
  });

  it(`Via ${seed.walletB.name}, can transfer token between ${seed.walletC.name} and others`, async () => {
    const res = await request(server)
      .post('/transfers')
      .set('Authorization', `Bearer ${bearerTokenB}`)
      .send({
        bundle: {
          bundle_size: 1,
        },
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletC.name,
        claim: false,
      });
    expect(res).property('statusCode').to.eq(202);
  });

  let transferId = 0;
  it(`Send a token to ${seed.walletC.name}`, async () => {
    const res = await request(server)
      .post('/transfers')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tokens: [seed.token.id],
        sender_wallet: seed.wallet.name,
        receiver_wallet: seed.walletC.name,
      });
    expect(res).property('statusCode').to.eq(202);
    expect(res.body).property('id').to.be.a.uuid('v4');
    transferId = res.body.id;
  });

  it(`${seed.walletB.name} can accept the transfer for ${seed.walletC.name}`, async () => {
    const res = await request(server)
      .post(`/transfers/${transferId}/accept`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
  });

  it(`Token:#${seed.token.id} now should belong to walletC:${seed.walletC.name}`, async () => {
    const res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.wallet_id).eq(seed.walletC.id);
  });
});
