require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const uuid = require('uuid');
const server = require('../server/app');
const seed = require('./seed');
chai.use(require('chai-uuid'));
const WalletService = require('../server/services/WalletService');

describe('Wallet: Get wallets of an account', () => {
  let bearerTokenA;
  let bearerTokenB;

  before(async () => {
    await seed.clear();
    await seed.seed();

    bearerTokenA = seed.wallet.keycloak_account_id;
    bearerTokenB = seed.walletB.keycloak_account_id;

    const walletService = new WalletService();

    for (let i = 0; i < 10; i += 1) {
      await walletService.createWallet(seed.wallet.id, `test${i}`);
    }

    const res = await walletService.getAllWallets(
      seed.wallet.id,
      undefined,
      undefined,
      'created_at',
      'desc',
    );
    expect(res.count).to.eq(11);
  });

  it('should return 401, user does not exist', async () => {
    await request(server)
      .get('/wallets')
      .send({ wallet: 'azAZ.-@0123456789' })
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${uuid.v4()}`)
      .expect(401);
  });

  it('Get wallets of WalletA without params', async () => {
    const res = await request(server)
      .get('/wallets')
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(res).property('statusCode').to.eq(200);
    expect(res.body.total).to.eq(11);

    const resB = await request(server)
      .get('/wallets')
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(resB).property('statusCode').to.eq(200);
    expect(resB.body.total).to.eq(2);
  });

  it('Get wallet by wallet name, success', async () => {
    const res = await request(server)
      .get('/wallets')
      .query({ name: 'walletB' })
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(res).property('statusCode').to.eq(200);
    expect(res.body.total).to.eq(1);
  });

  it('Get wallet which is managed by other account', async () => {
    const res = await request(server)
      .get(`/wallets`)
      .query({ name: 'test0' })
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(res).property('statusCode').to.eq(200);
    expect(res.body.total).to.eq(1);
    expect(res.body.wallets[0].name).to.eq(seed.walletB.name);
  });

  it('Get wallet with offset val', async () => {
    const res = await request(server)
      .get('/wallets')
      .query({ offset: 0 })
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(res).property('statusCode').to.eq(200);
    expect(res.body.total).to.eq(11);
    expect(+res.body.query.offset).to.eq(0);

    const resB = await request(server)
      .get('/wallets')
      .query({ limit: 100, offset: 2 })
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(resB).property('statusCode').to.eq(200);
    expect(resB.body.total).to.eq(11);
    expect(+resB.body.query.offset).to.eq(2);

    const resC = await request(server)
      .get('/wallets')
      .query({ limit: 2, offset: 0 })
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);
    expect(resC).property('statusCode').to.eq(200);
    expect(resC.body.total).to.eq(11);
    expect(+resC.body.query.offset).to.eq(0);
    expect(+resC.body.query.limit).to.eq(2);
  });

  it('Get wallet by valid uuid', async () => {
    const res = await request(server)
      .get(`/wallets/${seed.walletC.id}`)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);

    expect(res).property('statusCode').to.eq(200);
    expect(res.body.id).to.eq(seed.walletC.id);
  });

  it('Get wallet by valid uuid which does not exist', async () => {
    const res = await request(server)
      .get(`/wallets/00a6fa25-df29-4701-9077-557932591766`)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`);

    expect(res).property('statusCode').to.eq(404);
  });
});
