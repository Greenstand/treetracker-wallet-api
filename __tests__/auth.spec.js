require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
chai.use(require('chai-uuid'));

describe('Authentication', () => {
  before(async () => {
    await seed.clear();
    await seed.seed();
  });

  beforeEach(async () => {
    sinon.restore();
  });

  // Auth path
  it(`[POST /auth] login with ${seed.wallet.name}`, (done) => {
    request(server)
      .post('/auth')
      .set('treetracker-api-key', seed.apiKey)
      .send({ wallet: seed.wallet.name, password: seed.wallet.password })
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .end((err, res) => {
        if (err) done(err);
        expect(res.body).to.have.property('token');
        done();
      });
  });

  it(`[POST /auth] login with using wallet id: ${seed.wallet.id}`, (done) => {
    request(server)
      .post('/auth')
      .set('treetracker-api-key', seed.apiKey)
      .send({ wallet: seed.wallet.id, password: seed.wallet.password })
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .end((err, res) => {
        if (err) done(err);
        expect(res.body).to.have.property('token');
        done();
      });
  });
});
