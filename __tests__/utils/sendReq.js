const request = require('supertest');
const server = require('../../server/app');

async function get(endpoint, wallet, param, body) {
    const res = await request(server)
        .get(endpoint)
        .query(param)
        .send(body)
        .set('treetracker-api-key', wallet.apiKey)
        .set('Authorization', `Bearer ${wallet.token}`)
        .set('Content-Type', 'application/json');

    return res;
}

async function post(endpoint, wallet, param, body) {
    const res = await request(server)
        .post(endpoint)
        .query(param)
        .send(body)
        .set('treetracker-api-key', wallet.apiKey)
        .set('Authorization', `Bearer ${wallet.token}`)
        .set('Content-Type', 'application/json');


    return res
}

async function del(endpoint, wallet, param, body) {
    const res = await request(server)
        .del(endpoint)
        .query(param)
        .send(body)
        .set('treetracker-api-key', wallet.apiKey)
        .set('Authorization', `Bearer ${wallet.token}`)
        .set('Content-Type', 'application/json');

    return res;
}

module.exports = {
    get, post, del
};
