require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const seed = require('./seed');
const server = require('../server/app');

chai.use(require('chai-uuid'));

describe('GET events with a wallet filter', () => {
  let bearerTokenA;
  let bearerTokenB;

  beforeEach(async () => {
    await seed.clear();
    await seed.seed();

    bearerTokenA = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;
  });

  it('returns events for the logged-in wallet', async () => {
    const res = await request(server)
      .get('/events')
      .query({ limit: 10, wallet: seed.wallet.name })
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body.events).to.be.an('array');
  });

  it('returns events for a managed wallet', async () => {
    const res = await request(server)
      .get('/events')
      .query({ limit: 10, wallet: seed.walletC.name })
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(res).to.have.property('statusCode', 200);
    expect(res.body.events).to.be.an('array');
  });

  it('rejects a wallet the caller does not control', async () => {
    const res = await request(server)
      .get('/events')
      .query({ limit: 10, wallet: seed.walletC.name })
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(res).to.have.property('statusCode', 403);
  });

  it('returns 404 for an unknown wallet', async () => {
    const res = await request(server)
      .get('/events')
      .query({ limit: 10, wallet: 'does-not-exist' })
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(res).to.have.property('statusCode', 404);
  });
});
