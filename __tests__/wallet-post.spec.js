require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const uuid = require('uuid');
const server = require('../server/app');
const seed = require('./seed');
chai.use(require('chai-uuid'));
const WalletService = require('../server/services/WalletService');
const TrustService = require('../server/services/TrustService');

describe('Wallet: create(POST) wallets of an account', () => {
  let bearerTokenA;

  before(async () => {
    await seed.clear();
    await seed.seed();

    bearerTokenA = seed.wallet.keycloak_account_id;
  });

  it('create parent wallet', async () => {
    const keycloakId = uuid.v4();
    const res = await request(server)
      .post('/wallets')
      .send({ wallet: 'newParentWallet' })
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${keycloakId}`)
      .expect(201);

    expect(res.body).contain({ wallet: 'newParentWallet' });
    expect(res.body.id).to.exist;

    const walletService = new WalletService();
    const wallet = await walletService.getWalletIdByKeycloakId(keycloakId);
    expect(wallet.id).equal(res.body.id);

    const trustService = new TrustService();
    const trust = await trustService.getTrustRelationships(res.body.id, [], {
      walletId: res.body.id,
    });
    expect(trust.count).equal(0);
    expect(trust.result.length).equal(0);
  });

  it('create wallet by a valid wallet name', async () => {
    const walletService = new WalletService();
    const res = await request(server)
      .post('/wallets')
      .send({ wallet: 'azAZ.-@0123456789' })
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .expect(201);

    expect(res.body).contain({ wallet: 'azAZ.-@0123456789' });
    expect(res.body.id).to.exist;
    await walletService.getById(res.body.id).then((wallet) => {
      expect(wallet.name).to.eq('azAZ.-@0123456789');
    });

    const trustService = new TrustService();
    const trust = await trustService.getTrustRelationships(res.body.id, [], {
      walletId: res.body.id,
    });
    expect(trust.count).equal(1);
    expect(trust.result.length).equal(1);
    expect(trust.result[0].originating_wallet).equal('walletA');
    expect(trust.result[0].actor_wallet).equal('walletA');
    expect(trust.result[0].target_wallet).equal('azAZ.-@0123456789');
    expect(trust.result[0].type).equal('manage');
    expect(trust.result[0].state).equal('trusted');
    expect(trust.result[0].request_type).equal('manage');
  });

  it('create wallet by invalid name length', async () => {
    const res = await request(server)
      .post('/wallets')
      .send({ wallet: 'ab' })
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(res).property('statusCode').to.eq(422);

    const resB = await request(server)
      .post('/wallets')
      .send({
        wallet:
          'Kc6tWQiD99FZTxYgALuqhsY0XMRchFx3ecLuX1CfITgatCmsHEWFboGBUBU' +
          'mTHRjfoQpUHWUU5BMJqX9mz9i3mvFvhT8zPSvqYyDougCT1XL93K9AqAil6x22d1APuo5' +
          'GuQeXmxzL3YIJUWORWuGAMeWIbRrxdeKxrK7S0922As3sjr2k' +
          'mZk4GYzLbSUffoRE7CYeSmQIguyHNcVe18wWP5zj78G0rISTiCj8wvn' +
          'rtFbYBuGPfxEwHVs9kh6fSTUT3t6r6aYIPsvsRfM1wy',
      })
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(resB).property('statusCode').to.eq(422);
  });

  it('create wallet with invalid characters', async () => {
    const set = '~!#$%^&*()_+=[]\\{}|;\':",/<>?';

    // eslint-disable-next-line no-restricted-syntax
    for (const char of set) {
      const res = await request(server)
        .post('/wallets')
        .send({ wallet: `test${char}` })
        .set('content-type', 'application/json')
        .set('Authorization', `Bearer ${bearerTokenA}`);
      expect(res).property('statusCode').to.eq(422);
    }
  });
});
