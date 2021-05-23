const { sendPostRequest, responseStatus: {OK}, assert } = require("../config");
const { testData } = require("../libs/bootstrap.js");

let currentResponse = null;
const apiKey = testData.apiKey;
const url = '/auth';
const headers = {'treetracker-api-key': apiKey};
const user = {
    id: testData.wallet.id,
    wallet: testData.wallet.name,
    password: testData.wallet.password,
};

describe('Authentication', () => {
    it('[POST /auth] login with wallet name @auth @regression', async () => {
        const body = {
            wallet: user.wallet,
            password: user.password
        };

        currentResponse = await sendPostRequest(url, headers, body);

        assert.equals(currentResponse.status, OK, 'Response status code is not 200 (OK)!');
        assert.contains(currentResponse.header['content-type'], 'application/json', 'Content type is not in a json format!');
    });

    it('[POST /auth] login with using wallet ID @auth @regression', async () => {
        const body = {
            wallet: user.id,
            password: user.password
        };

        currentResponse = await sendPostRequest(url, headers, body);

        assert.equals(currentResponse.status, OK, 'Response status code is not 200 (OK)!');
        assert.contains(currentResponse.header['content-type'], 'application/json', 'Content type is not in a json format!');
    });
});