// Integration test: an admin reads a wallet and binds a keycloak account to a
// legacy wallet that has none (#1241).
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const uuid = require('uuid');
const server = require('../server/app');
const seed = require('./seed');

// The JWT mock reads "<keycloak id>#<roles>" from the bearer token.
const adminToken = `${uuid.v4()}#wallet-admin`;

describe('Admin binds a keycloak account to a wallet', () => {
  beforeEach(async () => {
    await seed.clear();
    await seed.seed();
  });

  it('reads a wallet with its keycloak account id', async () => {
    const res = await request(server)
      .get(`/admin/wallets/${seed.wallet.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).property('id').eq(seed.wallet.id);
    expect(res.body)
      .property('keycloak_account_id')
      .eq(seed.wallet.keycloak_account_id);
    expect(res.body).to.not.have.property('password');
    expect(res.body).to.not.have.property('salt');
  });

  it('binds an account and reports it on the next read', async () => {
    const keycloakAccountId = uuid.v4();

    const res = await request(server)
      .post(`/admin/wallets/${seed.walletB.id}/keycloak-account`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ keycloak_account_id: keycloakAccountId })
      .expect(200);

    expect(res.body).property('keycloak_account_id').eq(keycloakAccountId);

    const after = await request(server)
      .get(`/admin/wallets/${seed.walletB.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(after.body).property('keycloak_account_id').eq(keycloakAccountId);
  });

  it('rebinds a wallet that already has an account', async () => {
    const keycloakAccountId = uuid.v4();

    const res = await request(server)
      .post(`/admin/wallets/${seed.wallet.id}/keycloak-account`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ keycloak_account_id: keycloakAccountId })
      .expect(200);

    expect(res.body).property('keycloak_account_id').eq(keycloakAccountId);
  });

  it('lets two wallets share one account', async () => {
    const keycloakAccountId = uuid.v4();

    await request(server)
      .post(`/admin/wallets/${seed.wallet.id}/keycloak-account`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ keycloak_account_id: keycloakAccountId })
      .expect(200);

    await request(server)
      .post(`/admin/wallets/${seed.walletB.id}/keycloak-account`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ keycloak_account_id: keycloakAccountId })
      .expect(200);
  });

  it('refuses a body without a uuid', async () => {
    await request(server)
      .post(`/admin/wallets/${seed.wallet.id}/keycloak-account`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ keycloak_account_id: 'not-a-uuid' })
      .expect(422);
  });

  it('404s for a wallet that does not exist', async () => {
    await request(server)
      .post(`/admin/wallets/${uuid.v4()}/keycloak-account`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ keycloak_account_id: uuid.v4() })
      .expect(404);
  });

  it('refuses a signed-in user without the role', async () => {
    const res = await request(server)
      .post(`/admin/wallets/${seed.wallet.id}/keycloak-account`)
      .set('Authorization', `Bearer ${seed.wallet.keycloak_account_id}`)
      .send({ keycloak_account_id: uuid.v4() })
      .expect(403);

    expect(res.body.message).match(/wallet-admin role required/);
  });
});
