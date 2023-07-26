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

        const walletService = new WalletService();

        for (let i = 0; i < 1010; i += 1) {
            await walletService.createWallet(seed.wallet.id, `test${i}`)
        }

        const res = await walletService.getAllWallets(seed.wallet.id);
        expect(res.count).to.eq(1011);
    });

    beforeEach(async () => {
        sinon.restore();
    });

    it('Get wallets of WalletA without params, success', async () => {
        const res = await request(server)
            .get('/wallets')
            .set('treetracker-api-key', apiKey)
            .set('content-type', 'application/json')
            .set('Authorization', `Bearer ${bearerTokenA}`);

        expect(res).property('statusCode').to.eq(200);
        expect(res.body.total).to.eq(1000);

        const resB = await request(server)
            .get('/wallets')
            .set('treetracker-api-key', apiKey)
            .set('content-type', 'application/json')
            .set('Authorization', `Bearer ${bearerTokenB}`);

        expect(resB).property('statusCode').to.eq(200);
        expect(resB.body.total).to.eq(2);
    });

    it('Get wallet by wallet name, success', async () => {
        const res = await request(server)
            .get('/wallets')
            .query({name: 'walletB'})
            .set('treetracker-api-key', apiKey)
            .set('content-type', 'application/json')
            .set('Authorization', `Bearer ${bearerTokenB}`);

        expect(res).property('statusCode').to.eq(200);
        expect(res.body.total).to.eq(1);
    })

    it('Get wallet which is managed by other account', async () => {
        const res = await request(server)
            .get(`/wallets`)
            .query({name: 'test0'})
            .set('treetracker-api-key', apiKey)
            .set('content-type', 'application/json')
            .set('Authorization', `Bearer ${bearerTokenB}`);

        expect(res).property('statusCode').to.eq(200);
        expect(res.body.total).to.eq(1);
        expect(res.body.wallets[0].name).to.eq(seed.walletB.name);
    })
})
