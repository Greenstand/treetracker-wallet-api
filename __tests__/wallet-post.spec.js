require('dotenv').config();
const request = require('supertest');
const {expect} = require('chai');
const sinon = require('sinon');
const chai = require('chai');
const server = require('../server/app');
const seed = require('./seed');
chai.use(require('chai-uuid'));
const WalletService = require('../server/services/WalletService');

const {apiKey} = seed;

describe('Wallet: create(POST) wallets of an account', () => {
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

    it('create wallet by a valid wallet name', async () => {
        const walletService = new WalletService();
        const res = await request(server)
            .post('/wallets')
            .send({wallet: 'azAZ.-@0123456789'})
            .set('treetracker-api-key', apiKey)
            .set('content-type', 'application/json')
            .set('Authorization', `Bearer ${bearerTokenA}`);

        expect(res.body).contain({wallet: 'azAZ.-@0123456789'})
        expect(res.body.id).to.exist;
        await walletService.getById(res.body.id).then((wallet) => {
            expect(wallet.name).to.eq('azAZ.-@0123456789');
        })
    })

    it('create wallet by invalid name length', async () => {
        const res = await request(server)
            .post('/wallets')
            .send({wallet: 'ab'})
            .set('treetracker-api-key', apiKey)
            .set('content-type', 'application/json')
            .set('Authorization', `Bearer ${bearerTokenA}`);

        expect(res.body.code).to.eq(422);

        const resB = await request(server)
            .post('/wallets')
            .send({wallet: '2023.7.26CodingAtCanadaNiceToMeetYouuuuuuuuuuuuuuuu'})
            .set('treetracker-api-key', apiKey)
            .set('content-type', 'application/json')
            .set('Authorization', `Bearer ${bearerTokenA}`);

        expect(resB.body.code).to.eq(422);
    })

    it('create wallet with invalid characters', async () => {
        const set = "~!#$%^&*()_+=[]\\{}|;':\",/<>?";

        // eslint-disable-next-line no-restricted-syntax
        for(const char of set){
            const res = await request(server)
                .post('/wallets')
                .send({wallet: `test${char}`})
                .set('treetracker-api-key', apiKey)
                .set('content-type', 'application/json')
                .set('Authorization', `Bearer ${bearerTokenA}`);
            expect(res.body.code).to.eq(422);
        }
    })
})