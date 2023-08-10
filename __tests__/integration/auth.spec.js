require('dotenv').config();
const {expect} = require('chai');
const {post} = require('../utils/sendReq');
const walletAInfo = require('../mock-data/wallet/walletA.json');
const {clear, register} = require('../utils/testUtils');

describe('Authentication', () => {
    let walletA;

    before(clear)

    beforeEach(async () => {
         walletA = await register(walletAInfo);
    });

    afterEach(clear)

    it(`Login with valid username and password`, async () => {
        const res = await post('/auth', walletA, null, {wallet: walletA.name, password: walletA.password});
        expect(res.body).to.have.property('token');
        expect(res).to.have.property('statusCode', 200);
    });

    it(`Login with valid wallet id and password`, async () => {
        const res = await post('/auth', walletA, null, {wallet: walletA.id, password: walletA.password});
        expect(res.body).to.have.property('token');
        expect(res).to.have.property('statusCode', 200);
    });

    it(`Login with invalid password`, async () => {
        const res = await post('/auth', walletA, null, {wallet: walletA.id, password: 'abcabc123'});
        expect(res.body).to.not.have.property('token');
        expect(res).to.have.property('statusCode', 401);
    });

    it(`Login with invalid wallet name/id`, async () => {
        const res = await post('/auth', walletA, null, {wallet: 'walletB', password: walletA.password});
        expect(res.body).to.not.have.property('token');
        expect(res).to.have.property('statusCode', 404);

        const resB = await post('/auth', walletA, null, {wallet: '553c9d69-dcdf-48db-86ac-ed13380c62dc', password: walletA.password});
        expect(resB.body).to.not.have.property('token');
        expect(resB).to.have.property('statusCode', 404);
    });
});
