/*
 * Only tests the routes that do not alter the database and do not require tokens for now and can
 * add the other tests once we have endpoints that handle deletions and more robust database
 * Substitute personal apiKey in line 22 definition in order to test
 * Start server in terminal with 'npm run server' and run tests with 'npm run test-integration'
 */


const request = require('supertest');
const assert = require ('assert');
const server = 'http://localhost:3006';
const { expect } = require('chai');

const mockUser = {
  wallet: 'testuser',
  password: 'test1234',
};

// const mockWallet = {
//   wallet: "mockwallet"
// };

const apiKey = '';

describe('Route integration', () => {
  // Authorization path
  describe('/auth', () => {
    describe('POST', () => {
      it('authorizes user with token', (done) => {
        request(server)
          .post('/auth')
          .set('treetracker-api-key', apiKey)
          .send(mockUser)
          .expect('Content-Type', /application\/json/)
          .expect(200)
          .end((err, res) => {
            if (err) done(err);
            expect(res.body).to.have.property('token');
            done();
          });
      });
    });
  });
  // Authorizes before each of the follow tests
  beforeEach((done) => {
    request(server)
      .post('/auth')
      .set('treetracker-api-key', apiKey)
      .send(mockUser)
      .end((err, res) => {
        if (err) done(err);
        token = res.body.token;
        done();
      });
  });

  // Tests that require logged-in authorization

  // Get trees in user's wallet
  describe('/tree', () => {
    describe('GET', () => {
      it('gets trees from logged in user wallet', (done) => {
        request(server)
          .get('/tree')
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .expect('Content-Type', /application\/json/)
          .end((err, res) => {
            if (err) done(err);
            expect(res.body).to.have.property('trees');
            expect(res.body.trees).to.be.an('array');
            expect(res.body).to.have.property('wallet');
            expect(res.body).to.have.property('wallet_url');
            done();
          });
      });
    });
  });

// Get details of logged in account and sub-accounts
  describe('/account', () => {
    describe('GET', () => {
      it('gets account details', (done) => {
        request(server)
          .get('/account')
          .set('treetracker-api-key', apiKey)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .expect('Content-Type', /application\/json/)
          .end((err, res) => {
            if (err) done(err);
            expect(res.body).to.have.property('accounts');
            expect(res.body.accounts).to.be.an('array');
            done();
          });
      });
    });
  });

  /*
  Create a new managed sub-wallet for logged in account

  Don't have an endpoint that handles deletion yet so will only use this test once we have
  that and can undo action in the database

    describe('/account', () => {
      describe('POST', () => {
        it('creates new sub-wallet', (done) => {
          request(server)
            .post('/account')
            .set('treetracker-api-key', apiKey)
            .set('Authorization', `Bearer ${token}`)
            .send(mockWallet)
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .end((err, res) => {
              if (err) done(err);
              expect(res.body).to.have.property('wallet');
              assert(res.body.wallet === 'mockwallet', 'checks name of sub-wallet');
            });
        });
      });
    });

  */


});
