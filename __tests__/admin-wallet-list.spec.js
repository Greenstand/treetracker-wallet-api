// Integration test: an admin lists every wallet, including ones it neither owns
// nor manages, and is turned away without the wallet-admin role (#1239).
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const uuid = require('uuid');
const server = require('../server/app');
const seed = require('./seed');

// The JWT mock reads "<keycloak id>#<roles>" from the bearer token.
const adminToken = `${uuid.v4()}#wallet-admin`;

describe('GET /admin/wallets', () => {
  before(async () => {
    await seed.clear();
    await seed.seed();
  });

  it('lists every wallet, not just the caller\'s', async () => {
    const res = await request(server)
      .get('/admin/wallets')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const names = res.body.wallets.map((w) => w.name);
    expect(names).to.include.members([
      seed.wallet.name,
      seed.walletB.name,
      seed.walletC.name,
    ]);
    expect(res.body.total).to.eq(res.body.wallets.length);
  });

  it('filters by name', async () => {
    const res = await request(server)
      .get('/admin/wallets')
      .query({ name: seed.walletB.name })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.wallets.map((w) => w.name)).eql([seed.walletB.name]);
    expect(res.body.total).eq(1);
  });

  it('paginates, and reports the unpaginated total', async () => {
    const res = await request(server)
      .get('/admin/wallets')
      .query({ limit: 1, offset: 0 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.wallets).lengthOf(1);
    expect(res.body.total).to.be.greaterThan(1);
  });

  it('refuses a signed-in user without the role', async () => {
    const res = await request(server)
      .get('/admin/wallets')
      .set('Authorization', `Bearer ${seed.wallet.keycloak_account_id}`)
      .expect(403);

    expect(res.body.message).match(/wallet-admin role required/);
  });

  it('refuses an unauthenticated request', async () => {
    await request(server).get('/admin/wallets').expect(401);
  });
});
