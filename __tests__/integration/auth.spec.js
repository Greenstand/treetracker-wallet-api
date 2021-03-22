require('dotenv').config()
const request = require('supertest');
const server = require("../../server/app");
const { expect } = require('chai');
const log = require('loglevel');
const sinon = require("sinon");
const chai = require("chai");
chai.use(require('chai-uuid'));
const walletZaven = require("../mock-data/walletZaven.json");
const testUtils = require("./testUtils");

describe('Authentication', () => {
  let bearerToken;
  let bearerTokenB;
  let zavenObject;

  beforeEach(async () => {
    await testUtils.clear();
    zavenObject = await testUtils.register(walletZaven);
  })

  // Authorization path
  it.only(`[POST /auth] login with ${walletZaven.name}`, (done) => {
    request(server)
      .post('/auth')
      .set('treetracker-api-key', zavenObject.apiKey)
      .send({
        wallet: zavenObject.name, 
        password: zavenObject.password, 
      })
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .end((err, res) => {
        if (err) done(err);
        expect(res.body).to.have.property('token');
        done();
      });
  });


//  it(`[POST /auth] login with using wallet id: ${seed.wallet.id}`, (done) => {
//    request(server)
//      .post('/auth')
//      .set('treetracker-api-key', seed.apiKey)
//      .send({wallet: seed.wallet.id, password: seed.wallet.password})
//      .expect('Content-Type', /application\/json/)
//      .expect(200)
//      .end((err, res) => {
//        if (err) done(err);
//        expect(res.body).to.have.property('token');
//        done();
//      });
//  });

});
