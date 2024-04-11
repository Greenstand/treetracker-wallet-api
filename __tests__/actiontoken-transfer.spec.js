/*
 * The integration test to test the whole business, with DB
 */
require('dotenv').config();

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const seed = require('./seed');
const server = require('../server/app');

chai.use(require('chai-uuid'));

describe('Generate Action Token and Transfer ', () => {
  let bearerToken;
  let bearerTokenB;
  let actionToken ;

  before(async () => {
    
    await seed.clear();
    await seed.seed(); // this inserts one token to walletA but not walletB among other
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

  
 
  it(`Generate Actiontoken by wallet A`, async () => {
    await seed.addTokenToWallet(seed.wallet.id);
    const res = await request(server)
      .get(`/actiontoken/generate?email_id=rohit@gmail.com&limit=5`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);

    
    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.have.property('actionToken');
    actionToken = res.body.actionToken;
    
  });


  it(`Transfer actiontoken when B loggedIn`, async () => {
      const res = await request(server)
        .post(`/actiontoken/transfer`)
        .set('treetracker-api-key', seed.apiKey)
        .set('Authorization', `Bearer ${bearerTokenB}`)
        .send({actionToken });

      expect(res).to.have.property('statusCode', 200);
      expect(res.body).to.have.property('id')
      expect(res.body).to.have.property('state','completed')
      expect(res.body.parameters.tokens.length).to.equal(2);

  });



  it('Get all  transfers Belonging to walletA, should have one and completed', async () => {
    const res = await request(server)
      .get(`/transfers?wallet=${seed.walletB.name}&limit=10`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.transfers).lengthOf(1);
    expect(res.body.transfers[0]).to.have.property('state','completed')
   });


  it(`walletB, GET /tokens Should have 2 tokens now`, async () => {
    const res = await request(server)
      .get(`/tokens?limit=10`)
      .set('treetracker-api-key', seed.apiKey)
      .set('Authorization', `Bearer ${bearerTokenB}`);
    
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.tokens.length).to.equal(2);
  });

});

