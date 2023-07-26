require('dotenv').config();
const request = require('supertest');
const {expect} = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
chai.use(require('chai-uuid'));

const {apiKey} = seed;

describe('Wallet: Get wallets of an account', () => {
    let bearerTokenA;
    let bearerTokenB;

    before(async () => {
        await seed.clear();
        await seed.seed();

        {
            // Authorizes before each of the follow tests
            const res = await request(server)
                .post('/auth')
                .set('treetracker-api-key', apiKey)
                .send({
                    wallet: seed.wallet.name,
                    password: seed.wallet.password,
                });

            expect(res).to.have.property('statusCode', 200);
            bearerTokenA = res.body.token;
            expect(bearerTokenA).to.match(/\S+/);
        }

        {
            // Authorizes before each of the follow tests
            const res = await request(server)
                .post('/auth')
                .set('treetracker-api-key', apiKey)
                .send({
                    wallet: seed.walletB.name,
                    password: seed.walletB.password,
                });
            expect(res).to.have.property('statusCode', 200);
            bearerTokenB = res.body.token;
            expect(bearerTokenB).to.match(/\S+/);
        }
    });


    beforeEach(async () => {
        sinon.restore();
    });


})