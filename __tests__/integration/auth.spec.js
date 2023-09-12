require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const server = require('../../server/app');
chai.use(require('chai-uuid'));
const Zaven = require('../mock-data/Zaven.json');
const testUtils = require('./testUtils');

describe('Authentication', () => {
  let registeredUser;

  beforeEach(async () => {
    await testUtils.clear();
    registeredUser = await testUtils.register(Zaven);
  });

  // Authorization path
  it(`[POST /auth] login with ${Zaven.name}`, (done) => {
    request(server)
      .post('/auth')
      .set('treetracker-api-key', registeredUser.apiKey)
      .send({
        wallet: registeredUser.name,
        password: registeredUser.password,
      })
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .end((err, res) => {
        if (err) done(err);
        expect(res.body).to.have.property('token');
        done();
      });
  });
});
