require('dotenv').config();

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const seed = require('./seed');
const server = require('../server/app');

chai.use(require('chai-uuid'));


describe( 'Expired ActionToken Transfer ', ()=>{
  let bearerToken;
  let bearerTokenB;
  let actionToken ;
  let clock ;
  before(async () => {
    
    await seed.clear();
    await seed.seed(); 
    sinon.restore();

    {
      // Authorizes before each of the follow tests
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', seed.apiKey)
        .send({
          wallet: seed.wallet.name,
          password: seed.wallet.password,
        });
      expect(res).to.have.property('statusCode', 200);
      bearerToken = res.body.token;
      expect(bearerToken).to.match(/\S+/);
    }

    {
      // Authorizes before each of the follow tests
      const res = await request(server)
        .post('/auth')
        .set('treetracker-api-key', seed.apiKey)
        .send({
          wallet: seed.walletB.name,
          password: seed.walletB.password,
        });
      expect(res).to.have.property('statusCode', 200);
      bearerTokenB = res.body.token;
      expect(bearerTokenB).to.match(/\S+/);
    }
  }); 
  

  beforeEach(() => {
    const now = new Date(); // Current date/time
    const sevenDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 7 days ago
    clock = sinon.stub(Date, 'now').returns(sevenDaysAgo.getTime());

  });

  afterEach(() => {
    clock.restore();
  });


  it(`Generate access tokens for walletB`, async () => {
    await seed.addTokenToWallet(seed.wallet.id);
    const res = await request(server)
      .get(`/actiontoken/generate?email_id=rohit@gmail.com&limit=5`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);

    
    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('actionToken');
    actionToken = res.body.actionToken;
  });

    it('WalletB User should not be able to transfer on expiry', async ()=> {
      clock.restore(); 
      const res = await request(server)
        .post(`/actiontoken/transfer`)
        .set('treetracker-api-key', seed.apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({actionToken});
      
      expect(res).to.have.property('statusCode',401);
   })

  })