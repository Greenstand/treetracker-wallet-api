require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
chai.use(require('chai-uuid'));
const WalletService = require('../server/services/WalletService');

describe('Wallet: get(GET) single wallet by id', () => {
  let testWalletId;
  let testWalletName;
  let testWalletAbout;
  let bearerTokenA;

  before(async () => {
    await seed.clear();
    await seed.seed();

    // Authorize user and get bearer token
    const authRes = await request(server)
      .post('/auth')
      .send({
        wallet: seed.wallet.name,
        password: seed.wallet.password,
      });

    expect(authRes).to.have.property('statusCode', 200);
    bearerTokenA = authRes.body.token;
    expect(bearerTokenA).to.match(/\S+/);

    // Create test wallet
    const walletService = new WalletService();
    const wallet = await walletService.createWallet(seed.wallet.id, 'test');
    testWalletId = wallet.id;
    testWalletName = wallet.wallet;
    testWalletAbout = wallet.about;
  });

  beforeEach(async () => {
    sinon.restore();
  });

  after(async () => {
    await seed.clear();
  });

  it('should get wallet by id with correct response structure', async () => {
    await request(server)
      .get(`/wallets/${testWalletId}`)
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.have.property('id', testWalletId);
        expect(res.body).to.have.property('wallet', testWalletName);
        expect(res.body).to.have.property('about', testWalletAbout);
      });
  });

  it('should return 422 for random wallet id', async () => {
    await request(server)
      .get('/wallets/999999')
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .expect(422);
  });

  it('should return 404 for non-existed wallet id', async () => {
    await request(server)
      .get('/wallets/dc02db39-09a8-49cf-b9b2-7cd8656cc39a')
      .set('content-type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenA}`)
      .expect(404);
  });
});
